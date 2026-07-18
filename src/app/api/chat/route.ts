/**
 * NVIDIA NIM + Next.js 16 Serverless Chat Route
 * Primary: meta/llama-3.1-70b-instruct (NVIDIA NIM)
 * Fallback: Gemini 2.0 Flash
 */

import { getLiveTelemetry, logFanQuery, clientPromise, type StadiumState } from "@/lib/db";

export const runtime = "nodejs";

// --------------- Types ---------------

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

// --------------- System Prompt ---------------

async function getGateMetrics() {
  try {
    const client = await clientPromise;
    const db = client.db('stadium_ops');
    const logs = await db
      .collection('query_logs')
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    const counts = { gate1: 0, gate2: 0, gate3: 0, gate4: 0, gate5: 0, gate6: 0, gate7: 0, gate8: 0 };
    logs.forEach((log) => {
      const text = log.text || "";
      if (/Gate (G1|1)/i.test(text)) counts.gate1++;
      if (/Gate (G2|2)/i.test(text)) counts.gate2++;
      if (/Gate (G3|3)/i.test(text)) counts.gate3++;
      if (/Gate (G4|4)/i.test(text)) counts.gate4++;
      if (/Gate (G5|5)/i.test(text)) counts.gate5++;
      if (/Gate (G6|6)/i.test(text)) counts.gate6++;
      if (/Gate (G7|7)/i.test(text)) counts.gate7++;
      if (/Gate (G8|8)/i.test(text)) counts.gate8++;
    });

    const getStatus = (hits: number): "low" | "medium" | "high" => {
      if (hits >= 6) return "high";
      if (hits >= 3) return "medium";
      return "low";
    };

    return {
      "Gate G1": getStatus(counts.gate1),
      "Gate G2": getStatus(counts.gate2),
      "Gate G3": getStatus(counts.gate3),
      "Gate G4": getStatus(counts.gate4),
      "Gate G5": getStatus(counts.gate5),
      "Gate G6": getStatus(counts.gate6),
      "Gate G7": getStatus(counts.gate7),
      "Gate G8": getStatus(counts.gate8),
    };
  } catch {
    return null;
  }
}

function buildSystemPrompt(state: StadiumState, metrics: Record<string, string> | null): string {
  const gateCapacityList = metrics
    ? Object.entries(metrics)
        .map(([gate, status]) => `- ${gate}: ${status} congestion`)
        .join("\n")
    : "- Gate congestion details: Not available";

  return [
    "You are a multilingual transit assistant for the FIFA World Cup.",
    "STRICT: Keep answers under 3 sentences. No preamble.",
    "Live Telemetry:",
    `- Nearest Gate: ${state.nearestGate.label} (${state.nearestGate.status})`,
    `- Transit Hub: ${state.nearestHub.label} (${state.nearestHub.waitTime} min wait)`,
    `- Weather: ${state.weatherAdvisory.label} (${state.weatherAdvisory.condition})`,
    "Gate Capacities / Congestion levels:",
    gateCapacityList,
    "Use this data for specific guidance. Answer questions about gate capacities and recommendations accurately using these status levels.",
  ].join("\n");
}

// --------------- Route Handler ---------------

export async function POST(req: Request): Promise<Response> {
  const { messages }: { messages: Message[] } = await req.json();
  const stadiumState = await getLiveTelemetry();
  const metrics = await getGateMetrics();

  // Background: log query
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  if (lastUserMsg) logFanQuery(lastUserMsg.content);

  const systemPrompt = buildSystemPrompt(stadiumState, metrics);
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
        model: "meta/llama-3.1-8b-instruct",
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
