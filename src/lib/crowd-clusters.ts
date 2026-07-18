/**
 * Server-side co-location clustering — "nearby crowd" detection (DB layer).
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D2 — crowd = phone-cluster inference, D9 — confidence gating.
 *
 * Pure clustering lives in crowd-clusters-model.ts (unit-tested, DB-free).
 * This module persists clusters into the crowd_clusters collection (TTL 24h,
 * privacy by design) and provides read/lookup helpers for the API layer.
 */

import { clientPromise } from "@/lib/db";
import {
  clusterCrowd,
  latestUserPoints,
  PROXIMITY_RADIUS_M,
  type CrowdCluster,
  type UserPoint,
} from "@/lib/crowd-clusters-model";
import { LOOKBACK_WINDOW_MS } from "@/lib/venue-config";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";
const EVENTS_COLL = "position_events";
const CLUSTERS_COLL = "crowd_clusters";

export { PROXIMITY_RADIUS_M };
export type { CrowdCluster, UserPoint };

/**
 * Aggregate co-location clusters from recent position events and persist.
 */
export async function aggregateClusters(): Promise<CrowdCluster[]> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const since = Date.now() - LOOKBACK_WINDOW_MS;

  const events = await db
    .collection(EVENTS_COLL)
    .find({ timestamp: { $gte: since } })
    .toArray();

  const points = latestUserPoints(
    events.map((e) => ({
      userId: e.userId as string,
      x: e.x as number | undefined,
      y: e.y as number | undefined,
      timestamp: e.timestamp as number,
      eventType: e.eventType as string,
    })),
  );

  const clusters = clusterCrowd(points);

  if (clusters.length > 0) {
    await db.collection(CLUSTERS_COLL).deleteMany({}).catch(() => {});
    await db
      .collection(CLUSTERS_COLL)
      .insertMany(clusters.map((c) => ({ ...c })))
      .catch(() => {});
  }

  return clusters;
}

/** Find the cluster a given user belongs to (for per-user nearby count). */
export async function getUserCluster(
  userId: string,
  clusters: CrowdCluster[],
): Promise<{ clusterSize: number; nearbyCount: number; gateId: string } | null> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const since = Date.now() - LOOKBACK_WINDOW_MS;

  const events = await db
    .collection(EVENTS_COLL)
    .find({ userId, timestamp: { $gte: since } })
    .toArray();

  const points = latestUserPoints(
    events.map((e) => ({
      userId: e.userId as string,
      x: e.x as number | undefined,
      y: e.y as number | undefined,
      timestamp: e.timestamp as number,
      eventType: e.eventType as string,
    })),
  );
  if (points.length === 0) return null;

  const p = points[0];
  let match: CrowdCluster | undefined;
  for (const c of clusters) {
    if (Math.hypot(c.centroidX - p.x, c.centroidY - p.y) <= PROXIMITY_RADIUS_M) {
      match = c;
      break;
    }
  }
  if (!match) return null;

  return {
    clusterSize: match.size,
    nearbyCount: Math.max(0, match.size - 1),
    gateId: match.gateId,
  };
}

/** Read latest persisted clusters. */
export async function getLatestClusters(): Promise<CrowdCluster[]> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const docs = await db.collection(CLUSTERS_COLL).find({}).toArray();
  return docs.map((d) => ({
    id: d.id as string,
    size: d.size ?? 0,
    centroidX: d.centroidX ?? 0,
    centroidY: d.centroidY ?? 0,
    gateId: d.gateId as string,
    confidence: d.confidence ?? 0,
    timestamp: d.timestamp ?? Date.now(),
  }));
}
