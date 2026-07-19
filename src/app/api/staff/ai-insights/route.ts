/**
 * Staff Hub — Autonomous Tactical Command Agent.
 *
 * Replaces static rule-based OperationalInsights with an LLM-driven
 * operations commander. Feeds live gate telemetry, stadium telemetry, and
 * recent fan queries into the model and enforces a strict JSON schema so
 * the UI can render insight cards safely without prompt injection risk.
 *
 * Provider: NVIDIA NIM only (no Gemini key available). Rate-limited to the
 * NIM free-tier ceiling (20 req/min) via a shared in-memory token bucket.
 */

import { NextResponse } from "next/server";
import { getGateSummary } from "@/lib/crowd-aggregator";
import { getLatestLogs, getLiveTelemetry } from "@/lib/db";
import { nimRateLimiter } from "@/lib/rate-limiter";

export const runtime = "nodejs";

interface TacticalDirective {
  id: string;
  targetGate: string;
  message: string;
  actionRequired: string;
  suggestedStewardCount: number;
}

interface AIInsight {
  severity: "NOMINAL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  tacticalDirectives: TacticalDirective[];
  broadcastDraft: string;
  generatedAt: number;
}

const EMPTY_INSIGHT: AIInsight = {
  severity: "NOMINAL",
  tacticalDirectives: [],
  broadcastDraft: "All gates operating within normal parameters. No action required.",
  generatedAt: Date.now(),
};

/**
 * Build the commander prompt from live stadium state.
 */
function buildCommanderPrompt(
  telemetry: unknown,
  gateSummary: ReturnType<typeof getGateSummary> extends Promise<infer T> ? T : never,
  fanQueries: string[],
): string {
  return `You are the StadiumFlow AI Commander for the 2026 World Cup.
Analyze the current stadium state and issue real-time tactical adjustments.

Live Gate Summary (capacity %, status, recommended/avoid):
${JSON.stringify(gateSummary, null, 2)}

Hub Telemetry:
${JSON.stringify(telemetry, null, 2)}

Recent Fan Queries (last 20):
${JSON.stringify(fanQueries, null, 2)}

Synthesize this data. Identify operational bottlenecks, crowd safety risks,
or logistical delays. Produce tactical directives targeting specific gates
and a short broadcast message for fans near high-congestion zones.

Rules:
- severity must be NOMINAL only if all gates are open and no risks exist.
- Each directive needs a concrete actionRequired and a suggestedStewardCount.
- broadcastDraft must be ≤ 240 characters, calm, and actionable.`;
}

/**
 * Structured generation with NVIDIA NIM (JSON mode). Rate-limited — callers
 * must check nimRateLimiter.acquire() before invoking.
 */
async function generateWithNim(prompt: string): Promise<AIInsight | null> {
  const nvidiaKey = process.env.NVIDIA_NIM_API_KEY;
  if (!nvidiaKey) return null;

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
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 800,
        temperature: 0.4,
        stream: false,
      }),
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return null;
    return { ...(JSON.parse(text) as AIInsight), generatedAt: Date.now() };
  } catch (err) {
    console.error("NIM insights generation failed:", err);
    return null;
  }
}

/**
 * Deterministic fallback when no AI provider is configured — derive a
 * simple severity + directive from the gate summary so the UI still works.
 */
function deriveFallback(
  gateSummary: ReturnType<typeof getGateSummary> extends Promise<infer T> ? T : never,
): AIInsight {
  const critical = gateSummary.filter((g) => g.status === "critical");
  const busy = gateSummary.filter((g) => g.status === "busy");

  const tacticalDirectives: TacticalDirective[] = critical.map((g, i) => ({
    id: `fb-${i}`,
    targetGate: g.gateId,
    message: `${g.gateId} at ${g.capacityPct}% capacity — critical congestion.`,
    actionRequired: "Deploy reserve stewards and open auxiliary turnstiles.",
    suggestedStewardCount: 4,
  }));

  const severity = critical.length
    ? "CRITICAL"
    : busy.length
      ? "MEDIUM"
      : "NOMINAL";

  return {
    severity,
    tacticalDirectives,
    broadcastDraft:
      severity === "NOMINAL"
        ? "All gates operating normally. Enjoy the match."
        : `Heads up: congestion at ${critical[0]?.gateId ?? busy[0]?.gateId ?? "main gates"}. Follow steward guidance and allow extra time.`,
    generatedAt: Date.now(),
  };
}

export async function GET(request?: Request) {
  try {
    // Manual "Refresh Analysis" bypasses the shared rate limiter — user
    // explicitly opted in, so we spend a token even if the bucket is empty.
    const bypass =
      request &&
      new URL(request.url).searchParams.get("bypass") === "1";

    const [gateSummary, telemetry, logs] = await Promise.all([
      getGateSummary().catch(() => [] as Awaited<ReturnType<typeof getGateSummary>>),
      getLiveTelemetry().catch(() => null),
      getLatestLogs(20),
    ]);
    const fanQueries = logs
      .map((l) => (l && typeof l === "object" && "text" in l ? String((l as { text?: unknown }).text ?? "") : ""))
      .filter(Boolean);

    const prompt = buildCommanderPrompt(telemetry, gateSummary, fanQueries);

    // Shared NIM budget — if no token (and not an explicit bypass), serve
    // deterministic fallback and signal the client so the UI can show a
    // "rate-limited" state.
    if (!bypass && !nimRateLimiter.acquire()) {
      return NextResponse.json(
        { ...deriveFallback(gateSummary), rateLimited: true },
        { headers: { "X-RateLimited": "true" } },
      );
    }

    const insight =
      (await generateWithNim(prompt)) ??
      deriveFallback(gateSummary);

    return NextResponse.json(insight);
  } catch (err) {
    console.error("AI insights route error:", err);
    return NextResponse.json({ ...EMPTY_INSIGHT, generatedAt: Date.now() });
  }
}
