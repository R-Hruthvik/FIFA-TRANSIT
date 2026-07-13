/**
 * Unit tests for egress stagger algorithm (D10).
 * Run with: npx jest src/lib/egress-stagger.test.ts
 */

import {
  staggerEgress,
  generateMockUsers,
  generateMockCrowd,
  STADIUM_CAPACITY,
} from "./egress-stagger";
import type { GateCrowd } from "@/types/position";

describe("staggerEgress", () => {
  test("assigns all users when capacity allows", () => {
    const users = generateMockUsers(100);
    const crowd = generateMockCrowd();

    const result = staggerEgress(users, crowd, Date.now());

    // 100 users across 4 gates with 1000 capacity each = 4000 total
    // Should be able to assign all
    expect(result.deferredCount).toBe(0);
    expect(result.assignments.length).toBe(100);
    expect(result.assignments.every((a) => !a.deferred)).toBe(true);
  });

  test("defers users when gates are over capacity", () => {
    // Tight capacity: 4 gates × 10 capacity = 40
    const tightCrowd: GateCrowd[] = [
      { gateId: "Gate A", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
      { gateId: "Gate B", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
      { gateId: "Gate C", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
      { gateId: "Gate D", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
    ];

    const users = generateMockUsers(100);

    const result = staggerEgress(users, tightCrowd, Date.now());

    // Only 40 can be assigned
    expect(result.deferredCount).toBeGreaterThan(0);
    expect(result.assignments.filter((a) => a.deferred).length).toBe(result.deferredCount);
  });

  test("earlier-positioned users get earlier slots", () => {
    const now = Date.now();
    const users = [
      {
        userId: "close",
        etaToGate: { "Gate A": 2, "Gate B": 10, "Gate C": 15, "Gate D": 12 },
        earliestArrival: { "Gate A": 2 * 60_000, "Gate B": 10 * 60_000, "Gate C": 15 * 60_000, "Gate D": 12 * 60_000 },
      },
      {
        userId: "far",
        etaToGate: { "Gate A": 12, "Gate B": 8, "Gate C": 5, "Gate D": 10 },
        earliestArrival: { "Gate A": 12 * 60_000, "Gate B": 8 * 60_000, "Gate C": 5 * 60_000, "Gate D": 10 * 60_000 },
      },
    ];

    const crowd = generateMockCrowd();
    const result = staggerEgress(users, crowd, now);

    const close = result.assignments.find((a) => a.userId === "close")!;
    const far = result.assignments.find((a) => a.userId === "far")!;

    // The closer user should get an earlier leave time
    expect(close.leaveAt).toBeLessThanOrEqual(far.leaveAt);
  });
});
