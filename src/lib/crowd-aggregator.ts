/**
 * Gate crowd inference + confidence model.
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D2 — Gate crowd = phone-cluster inference
 * D9 — Confidence gating; below threshold → AI defers to stewards
 *
 * Stateless, on-read aggregation:
 *  1. Reads recent position_events from MongoDB
 *  2. Clusters by gateId to produce crowd counts (with exit decay)
 *  3. Applies the confidence model f(opt-in coverage × recency)
 *  4. Upserts results into gate_crowd (single source of truth for dashboard)
 *
 * Gates, thresholds and windows all come from venue-config (single source).
 */

import { clientPromise } from "@/lib/db";
import {
  GATES,
  GATE_IDS,
  LOOKBACK_WINDOW_MS,
} from "@/lib/venue-config";
import { computeConfidence, summarizeGate, CONFIDENCE_THRESHOLD } from "@/lib/crowd-model";
import { aggregateClusters, type CrowdCluster } from "@/lib/crowd-clusters";
import type { GateCrowd, GateSummary } from "@/types/position";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";
const EVENTS_COLL = "position_events";
const CROWD_COLL = "gate_crowd";

export { CONFIDENCE_THRESHOLD, computeConfidence, summarizeGate };

export interface AggregateResult {
  gateCrowds: GateCrowd[];
  summary: GateSummary[];
  clusters: CrowdCluster[];
}

/**
 * Run the crowd aggregation pipeline.
 * Stateless — safe to call on-read, on-change, or on a timer.
 */
export async function aggregateCrowd(): Promise<AggregateResult> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const now = Date.now();
  const since = now - LOOKBACK_WINDOW_MS;

  const events = await db
    .collection(EVENTS_COLL)
    .find({ timestamp: { $gte: since } })
    .toArray();

  // Per gate: set of currently-present users + newest event age.
  const gateActive = new Map<string, Set<string>>();
  const gateNewest = new Map<string, number>();
  const optedInUsers = new Set<string>();

  for (const ev of events) {
    const gateId = ev.gateId as string;
    const userId = ev.userId as string;
    const ts = ev.timestamp as number;
    const type = ev.eventType as string;

    if (!gateActive.has(gateId)) gateActive.set(gateId, new Set());
    const newest = gateNewest.get(gateId) ?? 0;
    if (ts > newest) gateNewest.set(gateId, ts);

    if (type === "geofence_enter" || type === "beacon_nearby") {
      gateActive.get(gateId)!.add(userId);
    } else if (type === "geofence_exit") {
      // Exit decay: drop the user unless a more recent enter/beacon exists.
      const userEvents = events.filter(
        (e) => e.userId === userId && e.gateId === gateId,
      );
      const exitTs = ts;
      const reEntered = userEvents.some(
        (e) =>
          e.timestamp > exitTs &&
          (e.eventType === "geofence_enter" || e.eventType === "beacon_nearby"),
      );
      if (!reEntered) gateActive.get(gateId)!.delete(userId);
    }

    if (type === "geofence_enter") optedInUsers.add(userId);
  }

  const totalOptIn = optedInUsers.size;

  const gateCrowds: GateCrowd[] = GATES.map((gate) => {
    const activeUsers = gateActive.get(gate.id)?.size ?? 0;
    const newest = gateNewest.get(gate.id) ?? 0;
    const ageMs = newest > 0 ? now - newest : LOOKBACK_WINDOW_MS;

    let confidence: number;
    if (totalOptIn === 0) {
      confidence = 0;
    } else {
      const optInRate = activeUsers / Math.max(totalOptIn, 1);
      confidence = computeConfidence(optInRate, ageMs);
    }

    return {
      gateId: gate.id,
      count: activeUsers,
      confidence,
      optInCount: totalOptIn,
      timestamp: now,
      capacityThreshold: gate.capacity,
    };
  });

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

  const summary = buildSummary(gateCrowds);
  const clusters = await aggregateClusters();
  return { gateCrowds, summary, clusters };
}

/**
 * Build a human-readable summary from gate crowd data.
 */
function buildSummary(gateCrowds: GateCrowd[]): GateSummary[] {
  return gateCrowds.map((gc) =>
    summarizeGate(gc.gateId, gc.count, gc.capacityThreshold, gc.confidence),
  );
}

// ── Read helpers ───────────────────────────────────────────────────────

export async function getLatestCrowd(): Promise<GateCrowd[]> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const docs = await db.collection(CROWD_COLL).find({}).toArray();

  // Ensure every known gate is represented even if no aggregation ran yet.
  const byId = new Map(docs.map((d) => [d.gateId as string, d]));
  return GATE_IDS.map((gateId) => {
    const doc = byId.get(gateId);
    const cfg = GATES.find((g) => g.id === gateId)!;
    return {
      gateId,
      count: doc?.count ?? 0,
      confidence: doc?.confidence ?? 0,
      optInCount: doc?.optInCount ?? 0,
      timestamp: doc?.timestamp ?? Date.now(),
      capacityThreshold: doc?.capacityThreshold ?? cfg.capacity,
    };
  });
}

export async function getGateSummary(): Promise<GateSummary[]> {
  const crowd = await getLatestCrowd();
  return buildSummary(crowd);
}

export async function hasCriticalGates(): Promise<boolean> {
  const summary = await getGateSummary();
  return summary.some((g) => g.status === "critical");
}
