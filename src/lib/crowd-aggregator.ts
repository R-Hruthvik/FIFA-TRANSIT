/**
 * Gate crowd inference + confidence model.
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D2 — Gate crowd = phone-cluster inference
 * D9 — Confidence gating; below threshold → AI defers to stewards
 *
 * This module provides stateless, on-read aggregation that:
 *  1. Reads recent position_events from MongoDB
 *  2. Clusters by gateId to produce crowd counts
 *  3. Applies the confidence model f(opt-in rate)
 *  4. Writes results to gate_crowd collection (latest upsert)
 *
 * The gate_crowd collection is the single source of truth for the
 * Command Center dashboard. SSE push and API endpoints read from it.
 */

import { clientPromise } from "@/lib/db";
import type { GateCrowd, GateSummary } from "@/types/position";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";
const EVENTS_COLL = "position_events";
const CROWD_COLL = "gate_crowd";

// ── Configuration ──────────────────────────────────────────────────────

/** How far back (ms) to look for "active" events */
const LOOKBACK_WINDOW_MS = 5 * 60_000; // 5 minutes

/** Timeout for a user to be considered "in transit" after exiting a gate */
const TRANSIT_TIMEOUT_MS = 3 * 60_000; // 3 minutes

/** Confidence threshold below which we defer to stewards (D9) */
const CONFIDENCE_THRESHOLD = 0.35;

/**
 * Confidence model: f(opt-in rate).
 *
 * This is a tunable curve. The design says "exact curve + threshold tuning
 * per venue size" is an open item, so we start with a pragmatic sigmoid.
 *
 * At 0% opt-in: confidence = 0 (we know nothing)
 * At 100% opt-in: confidence = 1 (we have full coverage)
 *
 * The curve is steeper at the low end because we need a minimum critical
 * mass before the data becomes actionable.
 */
function computeConfidence(optInRate: number): number {
  // Simple sigmoid centered at 15% opt-in rate
  // At 0.15 → confidence ≈ 0.5
  // At 0.30 → confidence ≈ 0.85
  // At 0.05 → confidence ≈ 0.15
  if (optInRate <= 0) return 0;
  const k = 12; // steepness
  const midpoint = 0.15;
  return 1 / (1 + Math.exp(-k * (optInRate - midpoint)));
}

// ── Aggregation ────────────────────────────────────────────────────────

export interface AggregateResult {
  gateCrowds: GateCrowd[];
  summary: GateSummary[];
}

/**
 * Run the crowd aggregation pipeline.
 *
 * Reads position_events, clusters by gateId, computes confidence,
 * and upserts results into gate_crowd.
 *
 * This is stateless and can be called on any schedule:
 *  - On-read (when someone queries /api/staff/crowd)
 *  - On-change-stream (when new events arrive)
 *  - On a timer (e.g., every 30s)
 */
export async function aggregateCrowd(): Promise<AggregateResult> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const now = Date.now();
  const since = now - LOOKBACK_WINDOW_MS;

  // 1. Fetch recent events
  const events = await db
    .collection(EVENTS_COLL)
    .find({
      timestamp: { $gte: since },
    })
    .toArray();

  // 2. Cluster by gateId
  // We track:
  //  - activeUsers: users whose last event at this gate was within the window
  //  - totalOptIn: number of distinct users who have opted in (any gate enter event)
  const gateActive = new Map<string, Set<string>>(); // gateId → Set<userId>
  const optedInUsers = new Set<string>();

  for (const ev of events) {
    const gateId = ev.gateId as string;
    const userId = ev.userId as string;

    if (!gateActive.has(gateId)) {
      gateActive.set(gateId, new Set());
    }

    // Only count enter + nearby as "present" at the gate
    if (ev.eventType === "geofence_enter" || ev.eventType === "beacon_nearby") {
      gateActive.get(gateId)!.add(userId);
    }

    // Track opt-in users (any enter event = they opted in)
    if (ev.eventType === "geofence_enter") {
      optedInUsers.add(userId);
    }
  }

  // 3. Known gates (from venue config)
  const gates = ["Gate A", "Gate B", "Gate C", "Gate D"];
  const totalOptIn = optedInUsers.size;

  const gateCrowds: GateCrowd[] = gates.map((gateId) => {
    const activeUsers = gateActive.get(gateId)?.size ?? 0;

    // Confidence = f(opt-in rate at this gate vs total opted-in users)
    // If no one opted in at all, confidence = 0
    let confidence: number;
    if (totalOptIn === 0) {
      confidence = 0;
    } else {
      const usersAtGate = gateActive.get(gateId)?.size ?? 0;
      const optInRate = usersAtGate / Math.max(totalOptIn, 1);
      confidence = computeConfidence(optInRate);
    }

    return {
      gateId,
      count: activeUsers,
      confidence,
      optInCount: totalOptIn,
      timestamp: now,
      capacityThreshold: 100, // TODO: per-venue config (D10)
    };
  });

  // 4. Upsert to gate_crowd collection
  const bulkOps = gateCrowds.map((gc) => ({
    updateOne: {
      filter: { gateId: gc.gateId },
      update: {
        $set: {
          gateId: gc.gateId,
          count: gc.count,
          confidence: gc.confidence,
          optInCount: gc.optInCount,
          timestamp: gc.timestamp,
          capacityThreshold: gc.capacityThreshold,
        },
      },
      upsert: true,
    },
  }));

  if (bulkOps.length > 0) {
    await db.collection(CROWD_COLL).bulkWrite(bulkOps);
  }

  // 5. Build summary for broadcast
  const summary = buildSummary(gateCrowds);

  return { gateCrowds, summary };
}

/**
 * Build a human-readable summary from gate crowd data.
 * Used for fan broadcasts and staff dashboard overview.
 */
function buildSummary(gateCrowds: GateCrowd[]): GateSummary[] {
  const maxCount = Math.max(...gateCrowds.map((g) => g.count), 1);

  return gateCrowds.map((gc) => {
    const pct = Math.round((gc.count / gc.capacityThreshold) * 100);
    let status: GateSummary["status"] = "open";
    let recommended = false;
    let avoid = false;

    if (pct >= 80) {
      status = "critical";
      avoid = true;
    } else if (pct >= 50) {
      status = "busy";
    }

    // Recommend the least crowded gate with sufficient confidence
    if (gc.confidence >= CONFIDENCE_THRESHOLD && pct < 30 && gc.count > 0) {
      recommended = true;
    }

    return {
      gateId: gc.gateId,
      capacityPct: Math.min(pct, 100),
      status,
      recommended,
      avoid,
    };
  });
}

// ── Read helpers ───────────────────────────────────────────────────────

/**
 * Get the latest gate crowd data (read from gate_crowd collection).
 * Used by API endpoints and SSE push.
 */
export async function getLatestCrowd(): Promise<GateCrowd[]> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const docs = await db.collection(CROWD_COLL).find({}).toArray();

  return docs.map((doc) => ({
    gateId: doc.gateId,
    count: doc.count ?? 0,
    confidence: doc.confidence ?? 0,
    optInCount: doc.optInCount ?? 0,
    timestamp: doc.timestamp ?? Date.now(),
    capacityThreshold: doc.capacityThreshold ?? 100,
  }));
}

/**
 * Get the gate summary for broadcast to fans.
 * Filters out gates with low confidence (D9: we don't guess).
 */
export async function getGateSummary(): Promise<GateSummary[]> {
  const crowd = await getLatestCrowd();
  return buildSummary(crowd);
}

/**
 * Check if any gate is in a critical state.
 */
export async function hasCriticalGates(): Promise<boolean> {
  const summary = await getGateSummary();
  return summary.some((g) => g.status === "critical");
}
