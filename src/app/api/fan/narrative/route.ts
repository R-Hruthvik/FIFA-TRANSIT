/**
 * Fan Hub — Proactive & Context-Aware Egress Narrative.
 *
 * Instead of forcing the fan to ask the chat, this route generates a
 * personalized, context-aware instruction narrative that sits at the top
 * of the fan dashboard. Compiles the fan's seat, language preference,
 * live location status, and real-time transit status, then asks the LLM
 * to produce a calm, single-paragraph briefing.
 *
 * Primary: Gemini. Fallback: NVIDIA NIM. Deterministic fallback otherwise.
 */

import { NextResponse } from "next/server";
import { getLiveTelemetry } from "@/lib/db";

export const runtime = "nodejs";

export interface FanNarrativeRequest {
  seat?: string;
  section?: string;
  language?: string;
  trackingEnabled?: boolean;
  location?: string;
  transitWaitTime?: number;
  weatherCondition?: "clear" | "rain";
}

function buildNarrativePrompt(input: FanNarrativeRequest): string {
  const lang = (input.language ?? "en").split("-")[0];
  return `You are the FanHub proactive assistant for the FIFA World Cup 2026.
Write a SHORT, calm, single-paragraph briefing (max 2 sentences, <= 220 chars)
for a fan. Use their context. Speak in ${lang}.

Fan context:
- Seat / Section: ${input.seat ?? input.section ?? "unknown"}
- Live location tracking: ${input.trackingEnabled ? `ON — near ${input.location ?? "stadium"}` : "OFF"}
- Transit hub wait: ${input.transitWaitTime ?? 0} min
- Weather: ${input.weatherCondition ?? "clear"}

Rules:
1. If tracking is OFF, gently encourage enabling it for a personalized route.
2. If weather is rain, mention covered concourse / bring a rain layer.
3. Mention the optimal nearby gate when tracking is ON.
4. No markdown, no preamble — output only the briefing text.`;
}

async function generateWithGemini(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 120, temperature: 0.3 },
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

async function generateWithNim(prompt: string): Promise<string | null> {
  const key = process.env.NVIDIA_NIM_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-70b-instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 120,
        temperature: 0.3,
        stream: false,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

function fallbackNarrative(input: FanNarrativeRequest): string {
  const where = input.trackingEnabled ? `near ${input.location ?? "your gate"}` : "with tracking off";
  const rain = input.weatherCondition === "rain" ? " Use the covered concourse — rain expected." : "";
  if (!input.trackingEnabled) {
    return `Enable live location tracking for a personalized exit route. Your shuttle wait is ${input.transitWaitTime ?? 0} min.${rain}`;
  }
  return `You're ${where}. Optimal exit is routed to keep you clear of congestion. Shuttle wait: ${input.transitWaitTime ?? 0} min.${rain}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FanNarrativeRequest;

    const telemetry = await getLiveTelemetry().catch(() => null);
    const enriched: FanNarrativeRequest = {
      ...body,
      transitWaitTime: body.transitWaitTime ?? telemetry?.nearestHub?.waitTime ?? 0,
      weatherCondition:
        body.weatherCondition ?? telemetry?.weatherAdvisory?.condition ?? "clear",
    };

    const prompt = buildNarrativePrompt(enriched);
    const text =
      (await generateWithGemini(prompt)) ??
      (await generateWithNim(prompt)) ??
      fallbackNarrative(enriched);

    return NextResponse.json({ narrative: text, generatedAt: Date.now() });
  } catch (err) {
    console.error("Fan narrative route error:", err);
    return NextResponse.json({
      narrative: "Enable live tracking for a personalized exit route.",
      generatedAt: Date.now(),
    });
  }
}
