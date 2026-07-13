/**
 * Privacy & retention utilities.
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D9 — Retention/anonymization: append-only position_events is a
 *      location-history liability (privacy hard requirement).
 *
 * Measures:
 *  1. TTL index (24h) on position_events — auto-delete old events
 *  2. deviceHash never stored (only used for rate-limiting in request)
 *  3. userId is pseudonymized (not real identity)
 *  4. Aggregation drops PII — only counts + confidence persist
 *  5. Anonymization pipeline for long-term analytics (opt-in cohort stats)
 */

import { clientPromise } from "@/lib/db";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";
const EVENTS_COLL = "position_events";
const ANON_COLL = "anon_cohort_stats";

// ── Pseudonymization ──────────────────────────────────────────────────

/**
 * Generate a pseudonymous user ID from a stable but non-identifying source.
 * In production: hash(userId + salt) so we can't reverse to real identity.
 */
export function pseudonymize(userId: string, salt: string): string {
  // Simple HMAC-like hash (use Web Crypto or Node crypto in production)
  let hash = 0;
  const str = userId + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `anon_${Math.abs(hash).toString(36)}`;
}

// ── Anonymization pipeline ────────────────────────────────────────────

interface CohortStat {
  gateId: string;
  hourBucket: string; // YYYY-MM-DD-HH
  eventCount: number;
  uniquePseudonyms: number;
  anonymizedAt: Date;
}

/**
 * Aggregate position_events into anonymized cohort stats.
 * Drops all PII — only aggregate counts survive.
 * Call this on a schedule (e.g., every hour) to build a privacy-safe
 * analytics layer from the soon-to-expire raw events.
 */
export async function anonymizeAndAggregate(): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const now = new Date();
  const hourBucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}-${String(now.getUTCHours()).padStart(2, "0")}`;

  // Group by gate + hour, count distinct pseudonyms
  const pipeline = [
    {
      $match: {
        timestamp: {
          $gte: now.getTime() - 60 * 60 * 1000, // last hour
        },
      },
    },
    {
      $group: {
        _id: {
          gateId: "$gateId",
          hour: hourBucket,
        },
        eventCount: { $sum: 1 },
        uniquePseudonyms: { $addToSet: "$userId" },
      },
    },
    {
      $project: {
        _id: 0,
        gateId: "$_id.gateId",
        hourBucket: "$_id.hour",
        eventCount: 1,
        uniquePseudonyms: { $size: "$uniquePseudonyms" },
      },
    },
  ];

  const results = await db.collection(EVENTS_COLL).aggregate(pipeline).toArray();

  if (results.length === 0) return;

  const stats: CohortStat[] = results.map((r: any) => ({
    gateId: r.gateId,
    hourBucket: r.hourBucket,
    eventCount: r.eventCount,
    uniquePseudonyms: r.uniquePseudonyms,
    anonymizedAt: now,
  }));

  // Upsert into anon collection
  const ops = stats.map((s) => ({
    updateOne: {
      filter: { gateId: s.gateId, hourBucket: s.hourBucket },
      update: { $set: s },
      upsert: true,
    },
  }));

  if (ops.length > 0) {
    await db.collection(ANON_COLL).bulkWrite(ops);
  }

  console.log(`Anonymized ${results.length} gate-hours of position data`);
}

// ── Consent / opt-in ──────────────────────────────────────────────────

/**
 * Check if a user has opted into tracking.
 * In production this would check a consent store.
 * For demo, we assume opt-in is true if they send events.
 */
export async function hasConsent(userId: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const consent = await db.collection("consents").findOne({ userId });
  return consent?.optedIn === true;
}

/**
 * Record opt-in consent.
 */
export async function recordConsent(userId: string, optedIn: boolean): Promise<void> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  await db.collection("consents").updateOne(
    { userId },
    {
      $set: {
        userId,
        optedIn,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );
}
