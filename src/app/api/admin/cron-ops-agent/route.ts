/**
 * Autonomous Telemetry Orchestration Worker.
 *
 * Background evaluation loop (cron scheduler or admin) that:
 *   1. Pulls live gate densities from aggregateCrowd().
 *   2. Feeds the full gateCrowds array to gemini-2.5-pro under a strict JSON
 *      response scheme. If any gate count exceeds 85% of its threshold, the
 *      model chooses OVERRIDE_LIMIT or DISPATCH_STEWARDS; otherwise NOMINAL.
 *   3. Executes automated DB writes without human intervention:
 *        - OVERRIDE_LIMIT   -> settings.global.gateOverrides[gateId] = "limited"
 *        - DISPATCH_STEWARDS -> insert into "steward_deployments"
 *   4. Records every run to "ops_agent_runs" for auditability.
 *
 * Auth: admin session OR `Authorization: Bearer <CRON_SECRET>` for schedulers.
 * Primary: gemini-2.5-pro. Deterministic fallback policy when no key / failure.
 */

import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { clientPromise, GLOBAL_SETTINGS_ID } from "@/lib/db";
import { aggregateCrowd } from "@/lib/crowd-aggregator";
import type { GateCrowd } from "@/types/position";

export const runtime = "nodejs";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";
const ROSTER_COLL = "steward_deployments";
const RUNS_COLL = "ops_agent_runs";

const OVERRIDE_THRESHOLD = 0.85;

const ACTIONS = ["OVERRIDE_LIMIT", "DISPATCH_STEWARDS", "NOMINAL"] as const;
type RecommendedAction = (typeof ACTIONS)[number];

interface AgentDecision {
  recommendedAction: RecommendedAction;
  targetGateId: string | null;
  stewardCountToDeploy: number;
  automatedSystemLog: string;
}

interface AgentResult extends AgentDecision {
  source: "gemini-2.5-pro" | "fallback";
}

async function authorize(req: Request): Promise<boolean> {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") || "";
  if (secret && header === `Bearer ${secret}`) return true;

  const session = await auth().catch(() => null);
  return session?.user?.role === "admin";
}

function utilization(gc: GateCrowd): number {
  return gc.capacityThreshold > 0 ? gc.count / gc.capacityThreshold : 0;
}

function buildPrompt(gateCrowds: GateCrowd[]): string {
  const lines = gateCrowds
    .map(
      (g) =>
        `- ${g.gateId}: count=${g.count}, threshold=${g.capacityThreshold}, utilization=${Math.round(utilization(g) * 100)}%`,
    )
    .join("\n");

  return [
    "You are the autonomous stadium operations orchestration agent (FIFA World Cup 2026).",
    "Evaluate the live gate densities below and decide a SINGLE intervention.",
    "",
    "Live gate crowd stats:",
    lines,
    "",
    "Decision rule: If ANY gate's current count exceeds 85% of its threshold",
    "capacity, choose 'OVERRIDE_LIMIT' or 'DISPATCH_STEWARDS' targeting that gate.",
    "Otherwise return 'NOMINAL' with targetGateId null and stewardCountToDeploy 0.",
    "",
    "Respond with ONLY compact JSON, no markdown, of this exact shape:",
    `{"recommendedAction":"OVERRIDE_LIMIT"|"DISPATCH_STEWARDS"|"NOMINAL","targetGateId":string|null,"stewardCountToDeploy":number,"automatedSystemLog":string}`,
    "automatedSystemLog: detailed text tracking why this configuration adjustment was applied.",
  ].join("\n");
}

function coerceAction(raw: unknown): RecommendedAction {
  const v = String(raw ?? "").toUpperCase();
  return (ACTIONS as readonly string[]).includes(v)
    ? (v as RecommendedAction)
    : "NOMINAL";
}

async function decideWithGemini(
  gateCrowds: GateCrowd[],
): Promise<AgentResult | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(gateCrowds) }] }],
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
    const action = coerceAction(parsed.recommendedAction);
    const valid = new Set(gateCrowds.map((g) => g.gateId));
    const rawGate = String(parsed.targetGateId ?? "");
    const targetGateId =
      action === "NOMINAL" ? null : valid.has(rawGate) ? rawGate : null;

    return {
      recommendedAction: action,
      targetGateId,
      stewardCountToDeploy: Math.max(
        0,
        Math.min(40, Math.round(Number(parsed.stewardCountToDeploy) || 0)),
      ),
      automatedSystemLog:
        String(parsed.automatedSystemLog ?? "").slice(0, 500) ||
        "Autonomous decision applied.",
      source: "gemini-2.5-pro",
    };
  } catch (err) {
    console.error("decideWithGemini error:", err);
    return null;
  }
}

/** Deterministic policy: dispatch stewards to the most-loaded gate over 85%. */
function fallbackDecision(gateCrowds: GateCrowd[]): AgentResult {
  const hottest = [...gateCrowds]
    .filter((g) => utilization(g) > OVERRIDE_THRESHOLD)
    .sort((a, b) => utilization(b) - utilization(a))[0];

  if (!hottest) {
    return {
      recommendedAction: "NOMINAL",
      targetGateId: null,
      stewardCountToDeploy: 0,
      automatedSystemLog:
        "All gates within safe capacity thresholds. No intervention required.",
      source: "fallback",
    };
  }

  const pct = Math.round(utilization(hottest) * 100);
  return {
    recommendedAction: "DISPATCH_STEWARDS",
    targetGateId: hottest.gateId,
    stewardCountToDeploy: 6,
    automatedSystemLog: `${hottest.gateId} at ${pct}% capacity exceeds the 85% safety threshold — dispatching 6 stewards to manage flow (deterministic fallback policy).`,
    source: "fallback",
  };
}

async function runAgent() {
  const { gateCrowds } = await aggregateCrowd();

  const decision =
    (await decideWithGemini(gateCrowds)) ?? fallbackDecision(gateCrowds);

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const now = new Date();
  const runId = crypto.randomUUID();

  if (decision.recommendedAction === "OVERRIDE_LIMIT" && decision.targetGateId) {
    await db.collection("settings").updateOne(
      { _id: GLOBAL_SETTINGS_ID },
      {
        $set: {
          [`gateOverrides.${decision.targetGateId}`]: "limited",
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  } else if (
    decision.recommendedAction === "DISPATCH_STEWARDS" &&
    decision.targetGateId
  ) {
    await db.collection(ROSTER_COLL).insertOne({
      deploymentId: crypto.randomUUID(),
      gateId: decision.targetGateId,
      stewards: decision.stewardCountToDeploy,
      reason: decision.automatedSystemLog,
      deployedBy: "ops-agent",
      runId,
      createdAt: now,
    });
  }

  await db.collection(RUNS_COLL).insertOne({
    runId,
    ...decision,
    gateCrowds,
    createdAt: now,
  });

  return { ok: true, runId, ...decision };
}

export async function POST(req: Request) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runAgent());
  } catch (err) {
    console.error("cron-ops-agent error:", err);
    return NextResponse.json(
      { error: "Orchestration run failed" },
      { status: 500 },
    );
  }
}

// Allow scheduler platforms that trigger via GET.
export async function GET(req: Request) {
  return POST(req);
}
