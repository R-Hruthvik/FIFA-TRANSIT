/**
 * Fan Hub — Proactive Briefing.
 *
 * Returns a deterministic template-based briefing based on fan context
 * (location, wait times, weather). Zero AI dependency — instant response.
 *
 * Only uses values the client explicitly provides — never reads from DB
 * to avoid stale/demo data leaking into real briefings.
 */

import { NextResponse } from "next/server";
import { nimRateLimiter } from "@/lib/rate-limiter";

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

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as FanNarrativeRequest;

    // Only use what the client explicitly provides — never read from DB.
    // DB telemetry may contain stale/demo data that would produce fake briefings.
    const wait = body.transitWaitTime;
    const weather = body.weatherCondition;
    const tracking = !!body.trackingEnabled;
    const loc = body.location;

    const hasRealContext =
      (wait != null && wait > 0) ||
      (weather != null && weather !== "clear") ||
      (tracking && !!loc);

    if (!hasRealContext) {
      return NextResponse.json({ narrative: null, generatedAt: Date.now() });
    }

    const parts: string[] = [];
    if (tracking && loc) {
      parts.push(`You're near ${loc}.`);
    } else if (!tracking) {
      parts.push("Enable live tracking for a personalized route.");
    }
    if (wait != null && wait > 0) {
      parts.push(`Main hub wait is ${wait} min.`);
    }
    if (weather === "rain") {
      parts.push("Rain expected — use covered concourse.");
    }

    const narrative = parts.length > 0
      ? parts.join(" ")
      : null;

    // Optional NVIDIA NIM enrichment — only when there's real content to
    // polish AND the shared budget has a token left. Rate-limited; on
    // 429/no-token we keep the deterministic template.
    const nvidiaKey = process.env.NVIDIA_NIM_API_KEY;
    let enriched: string | null = narrative;
    if (narrative && nvidiaKey && nimRateLimiter.acquire()) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8_000);
        const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${nvidiaKey}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: "meta/llama-3.1-70b-instruct",
            messages: [
              {
                role: "user",
                content: `Rewrite this stadium fan briefing into one friendly, calm sentence (max 240 chars). Keep all facts. Original: "${narrative ?? "Enjoy the match."}"`,
              },
            ],
            max_tokens: 120,
            temperature: 0.3,
            stream: false,
          }),
        });
        clearTimeout(timeout);
        if (res.ok) {
          const payload = await res.json();
          const firstChoice = Array.isArray(payload?.choices)
            ? payload.choices[0]
            : null;
          const text = firstChoice?.message?.content?.trim();
          if (text) enriched = text;
        }
      } catch {
        // keep deterministic narrative on any failure
      }
    }

    return NextResponse.json({ narrative: enriched, generatedAt: Date.now() });
  } catch (err) {
    console.error("Fan narrative route error:", err);
    return NextResponse.json({
      narrative: null,
      generatedAt: Date.now(),
    });
  }
}
