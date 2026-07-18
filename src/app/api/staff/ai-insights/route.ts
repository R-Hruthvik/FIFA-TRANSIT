/**
 * Staff Hub — Autonomous Tactical Command Agent.
 *
 * Replaces static rule-based OperationalInsights with an LLM-driven
 * operations commander. Feeds live gate telemetry, stadium telemetry, and
 * recent fan queries into the model and enforces a strict JSON schema so
 * the UI can render insight cards safely without prompt injection risk.
 *
 * Primary: Gemini (structured output via responseSchema).
 * Fallback: NVIDIA NIM (JSON mode) when Gemini is unavailable.
 */

import { NextResponse } from "next/server";
import { getGateSummary } from "@/lib/crowd-aggregator";
import { getLatestLogs, getLiveTelemetry } from "@/lib/db";

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
 * Attempt structured generation with Gemini (primary).
 */
async function generateWithGemini(prompt: string): Promise<AIInsight | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                severity: {
                  type: "STRING",
                  enum: ["NOMINAL", "LOW", "MEDIUM", "HIGH", "CRITICAL"],
                },
                tacticalDirectives: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      id: { type: "STRING" },
                      targetGate: { type: "STRING" },
                      message: { type: "STRING" },
                      actionRequired: { type: "STRING" },
                      suggestedStewardCount: { type: "NUMBER" },
                    },
                    required: [
                      "id",
                      "targetGate",
                      "message",
                      "actionRequired",
                      "suggestedStewardCount",
                    ],
                  },
                },
                broadcastDraft: { type: "STRING" },
              },
              required: ["severity", "tacticalDirectives", "broadcastDraft"],
            },
          },
        }),
      },
    );

    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return { ...(JSON.parse(text) as AIInsight), generatedAt: Date.now() };
  } catch (err) {
    console.error("Gemini insights generation failed:", err);
    return null;
  }
}

/**
 * Fallback structured generation with NVIDIA NIM (JSON mode).
 */
async function generateWithNim(prompt: string): Promise<AIInsight | null> {
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
        response_format: { type: "json_object" },
        max_tokens: 800,
        temperature: 0.4,
        stream: false,
      }),
    });

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

export async function GET() {
  try {
    const [gateSummary, telemetry, logs] = await Promise.all([
      getGateSummary().catch(() => [] as Awaited<ReturnType<typeof getGateSummary>>),
      getLiveTelemetry().catch(() => null),
      getLatestLogs(20),
    ]);
    const fanQueries = logs
      .map((l) => (l && typeof l === "object" && "text" in l ? String((l as { text?: unknown }).text ?? "") : ""))
      .filter(Boolean);

    const prompt = buildCommanderPrompt(telemetry, gateSummary, fanQueries);

    const insight =
      (await generateWithGemini(prompt)) ??
      (await generateWithNim(prompt)) ??
      deriveFallback(gateSummary);

    return NextResponse.json(insight);
  } catch (err) {
    console.error("AI insights route error:", err);
    return NextResponse.json({ ...EMPTY_INSIGHT, generatedAt: Date.now() });
  }
}
