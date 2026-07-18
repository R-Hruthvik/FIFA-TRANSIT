/**
 * Staff Hub — Agentic Copilot with Tool Calling.
 *
 * Operations staff talk to the Copilot in natural language to execute
 * manual overrides and dispatch personnel. The LLM selects tools
 * (toggleGateAccess / deployOperationalPersonnel), we execute them via
 * ./staff-actions, send the tool outputs back to the model, and return a
 * natural conversational confirmation.
 *
 * Primary: Gemini (functionCalling, multi-call). Fallback: NVIDIA NIM (tools).
 * When no provider is configured, the route still parses simple command
 * patterns (including multiple commands in one message) so the demo works
 * offline.
 *
 * All executed actions persist to MongoDB and, in demo mode, push into the
 * LiveDemoEngine so the UI updates in real time.
 */

import { NextResponse } from "next/server";
import { staffTools } from "@/lib/ai-tools";
import { executeAgentAction, type ToolCall, type ToolResult } from "@/lib/staff-actions";

export const runtime = "nodejs";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `You are the StadiumFlow Staff Copilot. You help operations managers control stadium flow.
You can call tools to change gate states and dispatch stewards. When a user asks to open/close/limit a gate or dispatch personnel, call the appropriate tool.
You may call multiple tools in a single turn if the user requests several actions.
After tools return, write a concise, natural confirmation of what you did.`;

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: unknown };
}

/** Offline parser — supports multiple commands in one message. */
function parseOfflineCommands(text: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const lower = text.toLowerCase();
  const gateNums = [...lower.matchAll(/gate\s*(g?\d+)/g)].map((m) =>
    `Gate G${m[1].replace("g", "")}`,
  );

  for (const gate of gateNums) {
    if (lower.includes("close")) {
      calls.push({ name: "toggleGateAccess", args: { gateId: gate, status: "CLOSED" } });
    } else if (lower.includes("open")) {
      calls.push({ name: "toggleGateAccess", args: { gateId: gate, status: "OPEN" } });
    } else if (lower.includes("limit")) {
      calls.push({ name: "toggleGateAccess", args: { gateId: gate, status: "LIMITED" } });
    }
  }

  for (const dm of lower.matchAll(/dispatch\s+(\d+).*?(gate\s*(g?\d)|main[\s-]?hub)/g)) {
    const count = parseInt(dm[1], 10);
    const loc = dm[2].includes("hub") ? "main-hub" : `Gate G${dm[3].replace("g", "")}`;
    calls.push({ name: "deployOperationalPersonnel", args: { location: loc, count } });
  }

  // De-dupe identical calls.
  return calls.filter(
    (c, i) => calls.findIndex((o) => o.name === c.name && JSON.stringify(o.args) === JSON.stringify(c.args)) === i,
  );
}

/** Build Gemini contents payload (with prior tool/exchange history). */
function toGeminiContents(messages: ChatMessage[], extra: GeminiPart[] = []) {
  const base = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  if (extra.length) {
    base.push({ role: "model", parts: extra as never });
  }
  return base;
}

/** First-pass call: returns either a text reply or function calls. */
async function geminiFirstPass(messages: ChatMessage[]): Promise<{
  reply: string;
  calls: ToolCall[];
}> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { reply: "", calls: [] };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: toGeminiContents(messages),
          tools: [{ functionDeclarations: staffTools.functionDeclarations }],
        }),
      },
    );
    if (!res.ok) return { reply: "", calls: [] };
    const data = await res.json();
    const parts: GeminiPart[] = data?.candidates?.[0]?.content?.parts ?? [];
    const calls: ToolCall[] = parts
      .filter((p) => p.functionCall)
      .map((p) => ({ name: p.functionCall!.name, args: p.functionCall!.args }));
    const text = parts.find((p) => p.text)?.text ?? "";
    return { reply: text, calls };
  } catch {
    return { reply: "", calls: [] };
  }
}

/** Second-pass call: feed tool results back, get a natural confirmation. */
async function geminiConfirm(messages: ChatMessage[], toolParts: GeminiPart[]): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "";
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: toGeminiContents(messages, toolParts),
          tools: [{ functionDeclarations: staffTools.functionDeclarations }],
        }),
      },
    );
    if (!res.ok) return "";
    const data = await res.json();
    const parts: GeminiPart[] = data?.candidates?.[0]?.content?.parts ?? [];
    return parts.find((p) => p.text)?.text ?? "";
  } catch {
    return "";
  }
}

/** NIM path: single round of tools + confirmation (when Gemini absent). */
async function nimWithTools(messages: ChatMessage[]): Promise<{ reply: string; calls: ToolCall[] }> {
  const key = process.env.NVIDIA_NIM_API_KEY;
  if (!key) return { reply: "", calls: [] };
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        tools: staffTools.functionDeclarations,
        max_tokens: 800,
        temperature: 0.3,
        stream: false,
      }),
    });
    if (!res.ok) return { reply: "", calls: [] };
    const data = await res.json();
    const msg = data?.choices?.[0]?.message;
    const calls: ToolCall[] = (msg?.tool_calls ?? []).map((tc: { function: { name: string; arguments: string } }) => ({
      name: tc.function.name,
      args: JSON.parse(tc.function.arguments || "{}"),
    }));
    return { reply: msg?.content ?? "", calls };
  } catch {
    return { reply: "", calls: [] };
  }
}

export async function POST(req: Request) {
  try {
    const { messages } = (await req.json()) as { messages: ChatMessage[] };
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) {
      return NextResponse.json({ reply: "No message provided." });
    }

    // Staff actions persist to MongoDB (real state). The demo engine is only
    // driven from the client DemoController, so we do NOT instantiate a server
    // singleton here — that would seed fake crowd positions in real sessions.
    const engine = null;

    // 1) Ask the model (Gemini primary, NIM fallback) for tools / reply.
    let first = await geminiFirstPass(messages);
    if (!first.calls.length && !first.reply) {
      first = await nimWithTools(messages);
    }
    // Offline fallback when no provider returned anything actionable.
    if (!first.calls.length && !first.reply.trim()) {
      first.calls = parseOfflineCommands(lastUser.content);
    }

    // 2) No tool calls → just return the conversational reply.
    if (!first.calls.length) {
      return NextResponse.json({
        reply:
          first.reply ||
          "Command not recognized. Try: 'Close Gate G3' or 'Dispatch 4 stewards to main-hub'.",
      });
    }

    // 3) Execute every requested tool, persist to Mongo + demo engine.
    const results: ToolResult[] = [];
    const toolParts: GeminiPart[] = [];
    for (const call of first.calls) {
      const result = await executeAgentAction(call, engine);
      results.push(result);
      toolParts.push({
        functionResponse: {
          name: call.name,
          response: { ok: result.ok, message: result.message },
        },
      });
    }

    // 4) Feed tool outputs back to the model for a natural confirmation.
    let reply = await geminiConfirm(messages, toolParts);
    if (!reply.trim() && !process.env.GEMINI_API_KEY && !process.env.NVIDIA_NIM_API_KEY) {
      // Offline: synthesize a confirmation from the executed results.
      reply = results.map((r) => (r.ok ? r.message : `Failed: ${r.message}`)).join(" ");
    }
    if (!reply.trim()) {
      reply = results.map((r) => (r.ok ? r.message : `Failed: ${r.message}`)).join(" ");
    }

    return NextResponse.json({
      reply,
      executed: results.map((r) => ({ tool: r.name, ok: r.ok, message: r.message })),
    });
  } catch (err) {
    console.error("Staff chat route error:", err);
    return NextResponse.json({ reply: "Assistant unavailable." });
  }
}
