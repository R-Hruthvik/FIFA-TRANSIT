/**
 * Pure crowd-detection model — no DB / IO dependencies.
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D2 — Gate crowd = phone-cluster inference, D9 — confidence gating.
 *
 * Kept free of MongoDB imports so it is unit-testable in isolation.
 */

import type { GateSummary } from "@/types/position";
import { CONFIDENCE_THRESHOLD } from "@/lib/venue-config";

export { CONFIDENCE_THRESHOLD };

/**
 * Confidence model: f(opt-in coverage, recency).
 *
 * Starts from the design's sigmoid on opt-in coverage, then discounts for
 * stale data: if the newest event at a gate is old, our read on the crowd
 * is weaker.
 *
 * At 0% opt-in → 0. At 100% opt-in, fresh data → ~1.
 */
export function computeConfidence(optInRate: number, newestEventAgeMs: number): number {
  const LOOKBACK_WINDOW_MS = 5 * 60_000;
  if (optInRate <= 0) return 0;
  const k = 12;
  const midpoint = 0.15;
  const base = 1 / (1 + Math.exp(-k * (optInRate - midpoint)));
  const recency = Math.max(0.5, 1 - newestEventAgeMs / (LOOKBACK_WINDOW_MS * 2));
  return Math.min(1, base * recency);
}

/**
 * Pure classification of a single gate from its count + confidence.
 */
export function summarizeGate(
  gateId: string,
  count: number,
  capacityThreshold: number,
  confidence: number,
): GateSummary {
  const pct = Math.round((count / capacityThreshold) * 100);
  let status: GateSummary["status"] = "open";
  let recommended = false;
  let avoid = false;

  if (pct >= 80) {
    status = "critical";
    avoid = true;
  } else if (pct >= 50) {
    status = "busy";
  }

  if (confidence >= CONFIDENCE_THRESHOLD && pct < 30 && count > 0) {
    recommended = true;
  }

  return {
    gateId,
    capacityPct: Math.min(pct, 100),
    status,
    recommended,
    avoid,
  };
}
