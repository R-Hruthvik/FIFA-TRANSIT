/**
 * NVIDIA NIM + Next.js 16 Serverless Chat Route
 * Primary: meta/llama-3.1-70b-instruct (NVIDIA NIM)
 * Fallback: Gemini 2.0 Flash
 */

import { getLiveTelemetry, logFanQuery, type StadiumState } from "@/lib/db";

export const runtime = "nodejs";

// --------------- Types ---------------

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

// --------------- System Prompt ---------------

function buildSystemPrompt(state: StadiumState): string {
  return [
    "You are a multilingual transit assistant for the FIFA World Cup.",
    "STRICT: Keep answers under 3 sentences. No preamble.",
    "Live Telemetry:",
    `- Nearest Gate: ${state.nearestGate.label} (${state.nearestGate.status})`,
    `- Transit Hub: ${state.nearestHub.label} (${state.nearestHub.waitTime} min wait)`,
    `- Weather: ${state.weatherAdvisory.label} (${state.weatherAdvisory.condition})`,
    "Use this data for specific guidance.",
  ].join("\n");
}

// --------------- Route Handler ---------------

export async function POST(req: Request): Promise<Response> {
  const { messages }: { messages: Message[] } = await req.json();
  const stadiumState = await getLiveTelemetry();

  // Background: log query
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (lastUserMsg) logFanQuery(lastUserMsg.content);

  const systemPrompt = buildSystemPrompt(stadiumState);
  const nvidiaKey = process.env.NVIDIA_NIM_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  let streamSource: Response;

  try {
    // 1. NVIDIA NIM Execution (Primary)
    if (!nvidiaKey) throw new Error("NVIDIA Key Missing");

    streamSource = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${nvidiaKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!streamSource.ok) throw new Error(`NIM status: ${streamSource.status}`);
  } catch (error) {
    console.warn("NVIDIA NIM Failed, falling back to Gemini", error);

    // 2. Gemini Execution (Fallback)
    if (!geminiKey) return new Response("AI Providers Unavailable", { status: 503 });

    const geminiContents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : m.role,
      parts: [{ text: m.content }],
    }));

    streamSource = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: geminiContents,
        }),
      },
    );
  }

  // 3. Unified SSE Parsing
  const encoder = new TextEncoder();
  const isNvidia = streamSource.url.includes("nvidia.com");

  const stream = new ReadableStream({
    async start(controller) {
      const reader = streamSource.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const payload = line.replace(/^data: /, "").trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const parsed = JSON.parse(payload);
              let text = "";

              if (isNvidia) {
                text = parsed.choices?.[0]?.delta?.content || "";
              } else {
                text = parsed.candidates?.[0]?.content?.parts?.[0]?.text || "";
              }

              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // skip malformed chunks
            }
          }
        }
      } catch (err) {
        console.error("Stream pipe error:", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
