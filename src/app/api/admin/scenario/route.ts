/**
 * Admin Console — "Prompt-to-Scenario" Synthetic Simulator.
 *
 * Replaces hardcoded simulation timelines with a Gen AI Scenario Engine.
 * An administrator enters a natural-language prompt (e.g. "Simulate a sudden
 * rainstorm during the 80th minute when Mexico scores an equalizer against
 * Brazil") and the LLM generates a structured 60-second timeline of mock
 * snapshot metrics, gate alerts, fake fan chat query lines, and thermal
 * configurations. The payload is consumed by the LiveDemoEngine to run
 * custom training drills.
 *
 * Primary: Gemini (structured output). Fallback: NVIDIA NIM (JSON mode).
 * Deterministic fallback when no provider is configured.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

export interface ScenarioSnapshot {
  t: number;
  gateDensities: Record<string, number>;
  alerts: string[];
  fanQueries: string[];
  thermal: { hotspotGate: string; intensity: number };
}

export interface ScenarioPayload {
  title: string;
  durationSeconds: number;
  snapshots: ScenarioSnapshot[];
  broadcastMessage: string;
}

const GATES = [
  "Gate G1", "Gate G2", "Gate G3", "Gate G4",
  "Gate G5", "Gate G6", "Gate G7", "Gate G8",
];

function buildScenarioPrompt(userPrompt: string): string {
  return `You are the StadiumFlow Scenario Engine for the 2026 World Cup.
Generate a synthetic 60-second training drill from this prompt:
"${userPrompt}"

Produce ${GATES.length}-gate density evolution across 6 snapshots (t = 0,10,20,30,40,50s).
Each snapshot: gate densities (0..1), 0-3 alerts, 0-3 fan chat queries, and a thermal hotspot.

Output STRICT JSON matching this schema:
{
  "title": string,
  "durationSeconds": 60,
  "snapshots": [
    {
      "t": number,
      "gateDensities": { "Gate G1": number, ... 8 gates },
      "alerts": string[],
      "fanQueries": string[],
      "thermal": { "hotspotGate": string, "intensity": number }
    }
  ],
  "broadcastMessage": string
}

Rules:
- Densities are 0..1 floats.
- Make the scenario escalate realistically toward the described event.
- broadcastMessage <= 200 chars, calm, actionable.`;
}

function emptyScenario(userPrompt: string): ScenarioPayload {
  return {
    title: userPrompt.slice(0, 60) || "Custom Scenario",
    durationSeconds: 60,
    snapshots: [0, 10, 20, 30, 40, 50].map((t) => ({
      t,
      gateDensities: Object.fromEntries(GATES.map((g) => [g, 0.2 + Math.random() * 0.3])),
      alerts: t === 30 ? ["Simulated surge detected at Gate G3"] : [],
      fanQueries: t === 20 ? ["How do I get out fastest?"] : [],
      thermal: { hotspotGate: "Gate G3", intensity: 0.4 + t / 200 },
    })),
    broadcastMessage: "Training drill active. Monitor all gates for simulated surges.",
  };
}

async function generateWithGemini(prompt: string): Promise<ScenarioPayload | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const gateProps = Object.fromEntries(GATES.map((g) => [g, { type: "NUMBER" }]));
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
                title: { type: "STRING" },
                durationSeconds: { type: "NUMBER" },
                snapshots: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      t: { type: "NUMBER" },
                      gateDensities: { type: "OBJECT", properties: gateProps },
                      alerts: { type: "ARRAY", items: { type: "STRING" } },
                      fanQueries: { type: "ARRAY", items: { type: "STRING" } },
                      thermal: {
                        type: "OBJECT",
                        properties: {
                          hotspotGate: { type: "STRING" },
                          intensity: { type: "NUMBER" },
                        },
                      },
                    },
                    required: ["t", "gateDensities", "alerts", "fanQueries", "thermal"],
                  },
                },
                broadcastMessage: { type: "STRING" },
              },
              required: ["title", "durationSeconds", "snapshots", "broadcastMessage"],
            },
          },
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return JSON.parse(text) as ScenarioPayload;
  } catch (err) {
    console.error("Gemini scenario generation failed:", err);
    return null;
  }
}

async function generateWithNim(prompt: string): Promise<ScenarioPayload | null> {
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
        max_tokens: 1200,
        temperature: 0.6,
        stream: false,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) return null;
    return JSON.parse(text) as ScenarioPayload;
  } catch (err) {
    console.error("NIM scenario generation failed:", err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return Response.json(
        { error: "Unauthorized: Administrative credentials required" },
        { status: 403 },
      );
    }

    const { prompt } = (await req.json()) as { prompt?: string };
    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const built = buildScenarioPrompt(prompt);
    const scenario =
      (await generateWithGemini(built)) ??
      (await generateWithNim(built)) ??
      emptyScenario(prompt);

    return NextResponse.json(scenario);
  } catch (err) {
    console.error("Scenario route error:", err);
    return NextResponse.json(emptyScenario("Custom Scenario"));
  }
}
