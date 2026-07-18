/**
 * Multimodal Incident Reporting Route (Premium).
 *
 * A fan submits a base64 JPEG (`imageBase64`) plus an `approximateLocation`
 * hint. Gemini 2.5 Flash performs vision analysis grounded in the stadium
 * GATES metadata and returns a strict JSON classification:
 *   category | severity | matchedGateId | aiSummary | stewardInstructions
 * The analyzed object is appended to the "incident_logs" collection with a
 * fresh timestamp.
 *
 * Primary: gemini-2.5-flash (REST, inlineData). Deterministic fallback when
 * no key / API failure so field ops always receive a report.
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { clientPromise } from "@/lib/db";
import { auth } from "@/lib/auth";
import { GATES, GATE_IDS } from "@/lib/venue-config";

// ~5MB base64 image + JSON overhead ceiling — reject oversized payloads.
const MAX_BODY_CHARS = 7_000_000;

export const runtime = "nodejs";

const DB_NAME = "stadium_ops";
const INCIDENT_COLL = "incident_logs";

const CATEGORIES = ["MAINTENANCE", "CROWD_CONTROL", "SAFETY", "MEDICAL"] as const;
const SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;

type Category = (typeof CATEGORIES)[number];
type Severity = (typeof SEVERITIES)[number];

interface ReportRequest {
  imageBase64: string;
  approximateLocation?: string;
}

interface IncidentAnalysis {
  category: Category;
  severity: Severity;
  matchedGateId: string | null;
  aiSummary: string;
  stewardInstructions: string;
}

/** Strip a data URL prefix if present, returning raw base64. */
function normalizeBase64(image: string): string {
  const match = /^data:[^;]+;base64,([\s\S]*)$/.exec(image);
  return match ? match[1] : image;
}

function coerceCategory(raw: unknown): Category {
  const v = String(raw ?? "").toUpperCase();
  return (CATEGORIES as readonly string[]).includes(v)
    ? (v as Category)
    : "SAFETY";
}

function coerceSeverity(raw: unknown): Severity {
  const v = String(raw ?? "").toUpperCase();
  return (SEVERITIES as readonly string[]).includes(v)
    ? (v as Severity)
    : "MEDIUM";
}

function coerceGate(raw: unknown, hint?: string): string | null {
  const v = String(raw ?? "").trim();
  if (GATE_IDS.includes(v)) return v;
  if (hint && GATE_IDS.includes(hint)) return hint;
  return null;
}

async function analyzeWithGemini(
  base64: string,
  location: string,
): Promise<IncidentAnalysis | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const gateContext = GATES.map(
    (g) => `${g.id} (label: ${g.label}, position x=${g.x} y=${g.y})`,
  ).join("; ");

  const prompt = [
    "You are the AI Safety Agent for a FIFA World Cup 2026 stadium.",
    "Analyze the attached photo of a fan-reported incident and classify it.",
    `Fan's approximate location hint: ${location || "unknown"}.`,
    `Stadium gates configuration: ${gateContext}.`,
    "Match the incident to the single closest gate id from that list, or null if unclear.",
    "Respond with ONLY a compact JSON object of this exact shape, no markdown:",
    `{"category":"MAINTENANCE"|"CROWD_CONTROL"|"SAFETY"|"MEDICAL","severity":"LOW"|"MEDIUM"|"HIGH"|"CRITICAL","matchedGateId":string|null,"aiSummary":string,"stewardInstructions":string}`,
    "aiSummary: 1-sentence engineering summary of what is visible.",
    "stewardInstructions: actionable instructions for dispatching roaming teams.",
  ].join("\n");

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inlineData: { mimeType: "image/jpeg", data: base64 } },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 512,
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      },
    );
    if (!res.ok) return null;
    const body = await res.json();
    const text: string =
      body?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
    if (!text) return null;

    const parsed = JSON.parse(text);
    return {
      category: coerceCategory(parsed.category),
      severity: coerceSeverity(parsed.severity),
      matchedGateId: coerceGate(parsed.matchedGateId, location),
      aiSummary:
        String(parsed.aiSummary ?? "").slice(0, 300) ||
        "Incident captured; visual detail limited.",
      stewardInstructions:
        String(parsed.stewardInstructions ?? "").slice(0, 400) ||
        "Dispatch nearest roaming team to assess and report back.",
    };
  } catch (err) {
    console.error("analyzeWithGemini (report) error:", err);
    return null;
  }
}

export async function POST(req: Request) {
  const session = await auth().catch(() => null);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bodyText = await req.text();
  if (bodyText.length > MAX_BODY_CHARS) {
    return NextResponse.json(
      { error: "Payload Too Large" },
      { status: 413 },
    );
  }

  let body: ReportRequest;
  try {
    body = JSON.parse(bodyText) as ReportRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.imageBase64) {
    return NextResponse.json(
      { error: "Missing imageBase64 payload" },
      { status: 400 },
    );
  }

  const base64 = normalizeBase64(body.imageBase64);
  const location = body.approximateLocation?.trim() || "";

  const analysis =
    (await analyzeWithGemini(base64, location)) ?? {
      category: "SAFETY" as Category,
      severity: "MEDIUM" as Severity,
      matchedGateId: coerceGate(null, location),
      aiSummary: "Automated analysis unavailable; manual review required.",
      stewardInstructions:
        "Dispatch a roaming team to the reported location for manual assessment.",
    };

  const record = {
    incidentId: crypto.randomUUID(),
    ...analysis,
    approximateLocation: location || null,
    source: process.env.GEMINI_API_KEY ? "gemini-2.5-flash" : "fallback",
    timestamp: new Date(),
  };

  try {
    const client = await clientPromise;
    await client.db(DB_NAME).collection(INCIDENT_COLL).insertOne(record);
  } catch (err) {
    console.error("incident_logs insert error:", err);
    return NextResponse.json(
      { error: "Failed to persist incident", incident: record },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, incident: record });
}
