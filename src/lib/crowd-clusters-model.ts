/**
 * Pure co-location clustering — no DB / IO dependencies.
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D2 — crowd = phone-cluster inference, D9 — confidence gating.
 *
 * Each opted-in app user emits position events carrying a stadium-center-
 * relative (x, y). We build a proximity graph (users within PROXIMITY_RADIUS_M
 * linked) and take connected components as "crowd clusters". This answers
 * "who is near me" on the server — no phone-to-phone Bluetooth (impossible on
 * iOS web). Kept DB-free for unit testing.
 */

import { GATES } from "@/lib/venue-config";
import { computeConfidence } from "@/lib/crowd-model";

/** Two users within this distance are considered "nearby" (co-located). */
export const PROXIMITY_RADIUS_M = 30;

export interface CrowdCluster {
  id: string;
  size: number;
  centroidX: number;
  centroidY: number;
  gateId: string;
  confidence: number;
  timestamp: number;
}

export interface UserPoint {
  userId: string;
  x: number;
  y: number;
  newest: number;
}

/**
 * Cluster opted-in users by proximity.
 * Pure — pass already-filtered recent points with x/y.
 */
export function clusterCrowd(
  points: UserPoint[],
  radiusM: number = PROXIMITY_RADIUS_M,
): CrowdCluster[] {
  const n = points.length;
  if (n === 0) return [];

  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const d = Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y);
      if (d <= radiusM) union(i, j);
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r)!.push(i);
  }

  const clusters: CrowdCluster[] = [];
  for (const idxs of groups.values()) {
    const members = idxs.map((i) => points[i]);
    const sx = members.reduce((s, m) => s + m.x, 0);
    const sy = members.reduce((s, m) => s + m.y, 0);
    const cx = sx / members.length;
    const cy = sy / members.length;

    let nearest = GATES[0];
    let best = Infinity;
    for (const g of GATES) {
      const d = Math.hypot(cx - g.x, cy - g.y);
      if (d < best) {
        best = d;
        nearest = g;
      }
    }

    const newest = Math.max(...members.map((m) => m.newest));
    const ageMs = Date.now() - newest;
    const confidence = computeConfidence(1, ageMs);

    clusters.push({
      id: `cluster-${Math.round(cx)}-${Math.round(cy)}`,
      size: members.length,
      centroidX: Math.round(cx),
      centroidY: Math.round(cy),
      gateId: nearest.id,
      confidence,
      timestamp: Date.now(),
    });
  }

  return clusters;
}

/**
 * Extract latest (x, y) point per opted-in user from recent events.
 * Uses the most recent event that has coordinates for each user.
 */
export function latestUserPoints(
  events: Array<{
    userId: string;
    x?: number;
    y?: number;
    timestamp: number;
    eventType: string;
  }>,
): UserPoint[] {
  const byUser = new Map<string, UserPoint>();
  for (const ev of events) {
    if (typeof ev.x !== "number" || typeof ev.y !== "number") continue;
    if (ev.eventType === "geofence_exit") {
      const existing = byUser.get(ev.userId);
      if (!existing || ev.timestamp > existing.newest) {
        byUser.delete(ev.userId);
      }
      continue;
    }
    const existing = byUser.get(ev.userId);
    if (!existing || ev.timestamp > existing.newest) {
      byUser.set(ev.userId, {
        userId: ev.userId,
        x: ev.x,
        y: ev.y,
        newest: ev.timestamp,
      });
    }
  }
  return [...byUser.values()];
}
