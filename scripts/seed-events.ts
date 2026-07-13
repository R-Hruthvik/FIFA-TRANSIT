/**
 * Seed script: populate position_events with synthetic data for testing.
 *
 * Usage:
 *   ts-node scripts/seed-events.ts [count]
 *
 * Generates `count` geofence + beacon events across the 4 gates, then
 * runs aggregateCrowd to populate gate_crowd.
 *
 * This is for LOCAL TESTING ONLY — never run in production. The design
 * explicitly forbids simulation in production (D1).
 */

import { clientPromise } from "../src/lib/db";
import { aggregateCrowd } from "../src/lib/crowd-aggregator";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";
const EVENTS_COLL = "position_events";

const GATES = ["Gate A", "Gate B", "Gate C", "Gate D"];

async function main() {
  const count = parseInt(process.argv[2] || "200", 10);
  console.log(`Seeding ${count} position events...`);

  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const coll = db.collection(EVENTS_COLL);

  // Clear existing (test only!)
  await coll.deleteMany({});

  const events = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const gateId = GATES[i % GATES.length]; // even distribution
    const userId = `seed-user-${i % 50}`; // 50 distinct users
    const eventType =
      i % 3 === 0 ? "geofence_enter" : i % 3 === 1 ? "beacon_nearby" : "geofence_exit";

    events.push({
      eventId: `seed-event-${i}`,
      userId,
      gateId,
      eventType,
      timestamp: now - Math.floor(Math.random() * 5 * 60 * 1000), // within 5 min
      beaconId: eventType === "beacon_nearby" ? `beacon-${gateId}` : undefined,
      rssi: eventType === "beacon_nearby" ? -60 + Math.floor(Math.random() * 20) : undefined,
      distanceMeters:
        eventType === "beacon_nearby" ? 5 + Math.floor(Math.random() * 15) : undefined,
      receivedAt: new Date(),
    });
  }

  await coll.insertMany(events);
  console.log(`Inserted ${events.length} events`);

  // Run aggregation
  const result = await aggregateCrowd();
  console.log("\nAggregated crowd data:");
  for (const gc of result.gateCrowds) {
    console.log(
      `  ${gc.gateId}: ${gc.count} users, ${(gc.confidence * 100).toFixed(0)}% confidence`,
    );
  }

  console.log("\nSummary for broadcast:");
  for (const s of result.summary) {
    console.log(
      `  ${s.gateId}: ${s.capacityPct}% → ${s.status}${s.recommended ? " (RECOMMENDED)" : ""}${s.avoid ? " (AVOID)" : ""}`,
    );
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
