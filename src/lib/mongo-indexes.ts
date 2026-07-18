/**
 * MongoDB index definitions for the real-time tracking system.
 *
 * Run this once (e.g., in a setup script or at app startup) to ensure
 * indexes exist. TTL index on position_events enforces the retention
 * policy required by D9 (privacy).
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D9 — Append-only position_events is a location-history liability;
 *      TTL + anonymization are privacy hard requirements.
 */

import { clientPromise } from "@/lib/db";
import type { IndexSpecification } from "mongodb";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";

interface IndexDef {
  collection: string;
  keys: IndexSpecification;
  options?: Record<string, unknown>;
}

const INDEXES: IndexDef[] = [
  // TTL: auto-delete events older than 24 hours (privacy by design)
  {
    collection: "position_events",
    keys: { receivedAt: 1 },
    options: { expireAfterSeconds: 86400, name: "ttl_receivedAt_24h" },
  },
  // Unique constraint on eventId for idempotency
  {
    collection: "position_events",
    keys: { eventId: 1 },
    options: { unique: true, name: "uniq_eventId" },
  },
  // Compound index for aggregation queries (by gate + time range)
  {
    collection: "position_events",
    keys: { gateId: 1, timestamp: -1 },
    options: { name: "idx_gate_timestamp" },
  },
  // Unique gateId for gate_crowd collection (one doc per gate)
  {
    collection: "gate_crowd",
    keys: { gateId: 1 },
    options: { unique: true, name: "uniq_gateId" },
  },
  // TTL on co-location clusters (privacy by design, D9)
  {
    collection: "crowd_clusters",
    keys: { timestamp: 1 },
    options: { expireAfterSeconds: 86400, name: "ttl_clusters_24h" },
  },
];

export async function ensureIndexes(): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  for (const idx of INDEXES) {
    const coll = db.collection(idx.collection);
    await coll.createIndex(idx.keys, idx.options);
  }
}
