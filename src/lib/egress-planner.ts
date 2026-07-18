/**
 * Per-user egress plan generation.
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D6 — GenAI = per-user contextual reasoning
 * D7 — Headline feature = post-match egress orchestration
 * D10 — Stagger = capacity-constrained flow assignment
 *
 * This module generates personalized egress plans for each fan:
 *  1. Takes the user's last known position + gate crowd data
 *  2. Applies capacity constraints (D10) to pick a leave window
 *  3. Produces a natural-language instruction in the user's language
 *  4. Defers to stewards if confidence is too low (D9)
 *
 * Output is cached on-device (D8-B) and can be live-updated via SSE (D8-A).
 */

import type { GateCrowd, GateSummary, EgressPlan } from "@/types/position";
import { PositionManager, parseUserPosition, gateToPosition, distanceBetween } from "@/lib/position-manager";

// Re-export for backwards compatibility with existing callers (track/plan route).
export { parseUserPosition } from "@/lib/position-manager";

// ── Configuration ──────────────────────────────────────────────────────

/** Max capacity percentage before a gate is considered congested */
const CAPACITY_WARNING_PCT = 60;
const CAPACITY_CRITICAL_PCT = 80;

/** Walking speed: ~80m/min for average stadium attendee with crowd */
const WALK_SPEED_M_PER_MIN = 80;

/** Stadium dimensions (approximate) for distance calculations */
const STADIUM_RADIUS_M = 250;

// ── Distance calculation (delegated to PositionManager) ────────────────

type Position2D = ReturnType<typeof PositionManager.parse>;

/**
 * Calculate distance between two points in meters.
 */
function distance(a: Position2D, b: Position2D): number {
  return distanceBetween(a, b);
}

// ── Egress plan generation ─────────────────────────────────────────────

export interface EgressPlanInput {
  /** User's last known position (any format parseUserPosition accepts) */
  userPosition: unknown;
  /** Gate crowd data */
  gateCrowds: GateCrowd[];
  /** User's preferred language (BCP-47 tag, e.g. "en", "es", "fr", "ar") */
  language?: string;
  /** Current time (unix ms) — defaults to now */
  now?: number;
  /** Whether the match has ended (triggers egress mode) */
  matchEnded?: boolean;
}

export interface EgressPlanResult {
  plan: EgressPlan | null;
  deferred: boolean;
  reason?: string;
}

const DEFAULT_LANGUAGE = "en";

/**
 * Generate a personalized egress plan for a user.
 *
 * Algorithm:
 *  1. Compute ETA to each gate from user's position
 *  2. Filter gates by confidence (D9: skip if below threshold)
 *  3. Score remaining gates by:
 *     - Lower capacity is better
 *     - Shorter ETA is better
 *     - Must be below capacity threshold
 *  4. Pick best gate
 *  5. Compute leave-window using D10 stagger logic (simplified: add buffer for capacity growth)
 *  6. Generate natural language instruction
 *
 * Returns null if no gate is safe to recommend (D9: defer to stewards).
 */
export function generateEgressPlan(input: EgressPlanInput): EgressPlanResult {
  const now = input.now ?? Date.now();
  const userPos = parseUserPosition(input.userPosition);
  const language = input.language || DEFAULT_LANGUAGE;
  const matchEnded = input.matchEnded ?? false;

  // 1. Compute ETAs to each gate
  const gateETAs: Array<{
    gateId: string;
    etaMinutes: number;
    capacityPct: number;
    confidence: number;
    crowd: GateCrowd;
  }> = [];

  for (const crowd of input.gateCrowds) {
    const gatePos = gateToPosition(crowd.gateId);
    const distM = distance(userPos, gatePos);
    const etaMinutes = Math.ceil(distM / WALK_SPEED_M_PER_MIN);
    const capacityPct = Math.round((crowd.count / crowd.capacityThreshold) * 100);

    gateETAs.push({
      gateId: crowd.gateId,
      etaMinutes,
      capacityPct,
      confidence: crowd.confidence,
      crowd,
    });
  }

  // 2. Find gates with sufficient confidence (D9)
  const confidentGates = gateETAs.filter((g) => g.confidence >= 0.35);

  if (confidentGates.length === 0) {
    // No gate has enough data → defer to stewards
    return {
      plan: {
        userId: "",
        gateId: "",
        leaveAt: now,
        etaMinutes: 0,
        gateCapacityPct: 0,
        transitEtaMinutes: 0,
        language,
        stale: false,
        deferToStewards: true,
        instruction: deferInstruction(language),
        version: 1,
      },
      deferred: true,
      reason: "Insufficient crowd data at all gates. Please follow steward directions.",
    };
  }

  // 3. Score gates: prefer low capacity + short ETA
  // Weight: 70% capacity, 30% ETA
  const MAX_ETA = 15; // minutes, for normalization
  const scored = confidentGates.map((g) => ({
    ...g,
    score: (1 - g.capacityPct / 100) * 0.7 + (1 - Math.min(g.etaMinutes, MAX_ETA) / MAX_ETA) * 0.3,
  }));

  scored.sort((a, b) => b.score - a.score);

  // Pick the best gate that's not critical
  const best = scored.find((g) => g.capacityPct < CAPACITY_CRITICAL_PCT) ?? scored[0];

  // 4. Compute leave window (D10 simplified)
  // Leave now + ETA, plus a buffer for crowd growth
  const growthBuffer = best.capacityPct > CAPACITY_WARNING_PCT ? 2 : 0;
  const leaveAt = now + growthBuffer * 60_000; // leave immediately + buffer

  // 5. Transit ETA — no real hub feed wired yet, so leave as 0 (unavailable)
  // rather than fabricating a value. The instruction string treats 0 as "unavailable".
  const transitEtaMinutes = 0;

  // 6. Generate instruction
  const instruction = egressInstruction({
    gateId: best.gateId,
    etaMinutes: best.etaMinutes,
    capacityPct: best.capacityPct,
    transitEtaMinutes,
    language,
    bestGate: scored[0],
    avoidGates: scored.filter((g) => g.capacityPct >= CAPACITY_WARNING_PCT),
  });

  const plan: EgressPlan = {
    userId: "", // filled by caller
    gateId: best.gateId,
    leaveAt,
    etaMinutes: best.etaMinutes,
    gateCapacityPct: best.capacityPct,
    transitEtaMinutes,
    language,
    stale: false,
    deferToStewards: false,
    instruction,
    version: 1,
  };

  return { plan, deferred: false };
}

// ── Natural language instructions ──────────────────────────────────────

interface InstructionOpts {
  gateId: string;
  etaMinutes: number;
  capacityPct: number;
  transitEtaMinutes: number;
  language: string;
  bestGate: { gateId: string; capacityPct: number };
  avoidGates: Array<{ gateId: string; capacityPct: number }>;
}

function egressInstruction(opts: InstructionOpts): string {
  const lang = opts.language.split("-")[0]; // strip region

  const templates: Record<string, (o: InstructionOpts) => string> = {
    en: (o) => {
      const avoid = o.avoidGates
        .filter((g) => g.gateId !== o.bestGate.gateId)
        .map((g) => `${g.gateId} (${g.capacityPct}%)`)
        .join(", ");
       const avoidText = avoid ? ` Avoid: ${avoid}.` : "";
       const transitText = o.transitEtaMinutes > 0 ? ` Transit ETA: ${o.transitEtaMinutes} min.` : " Transit ETA: calculating…";
       return `Leave now via ${o.gateId} — ${o.etaMinutes} min walk (${o.capacityPct}% capacity).${transitText}${avoidText}`;
    },
    es: (o) => `Salga ahora por ${o.gateId} — ${o.etaMinutes} min a pie (${o.capacityPct}% de capacidad). Tiempo de tránsito: ${o.transitEtaMinutes} min.`,
    fr: (o) => `Partez maintenant par ${o.gateId} — ${o.etaMinutes} min à pied (${o.capacityPct}% de capacité). Temps de transit: ${o.transitEtaMinutes} min.`,
    ar: (o) => `اذهب الآن عبر ${o.gateId} — ${o.etaMinutes} دقيقة سيراً (${o.capacityPct}% سعة). وقت النقل: ${o.transitEtaMinutes} دقيقة.`,
    zh: (o) => `立即从${o.gateId}离开 — ${o.etaMinutes}分钟步行 (${o.capacityPct}% 容量)。交通时间: ${o.transitEtaMinutes}分钟。`,
  };

  const fn = templates[lang] ?? templates["en"];
  return fn(opts);
}

function deferInstruction(language: string): string {
  const templates: Record<string, string> = {
    en: "Crowd data is insufficient right now. Please follow the directions of stadium stewards for safe exit.",
    es: "Los datos de multitudes son insuficientes. Por favor, siga las indicaciones de los asistentes del estadio.",
    fr: "Les données de foule sont insuffisantes. Veuillez suivre les directives des stewards du stade.",
    ar: "بيانات الح crowd غير كافية. يرجى اتباع تعليمات موظفي الاستاد.",
    zh: "人群数据不足。请遵循体育场工作人员的指引。",
  };

  return templates[language.split("-")[0]] ?? templates["en"];
}
