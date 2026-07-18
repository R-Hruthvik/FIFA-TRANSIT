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

    // 100 users across 8 gates with 1000 capacity each = 8000 total
    // Should be able to assign all
    expect(result.deferredCount).toBe(0);
    expect(result.assignments.length).toBe(100);
    expect(result.assignments.every((a) => !a.deferred)).toBe(true);
  });

  test("defers users when gates are over capacity", () => {
    // Tight capacity: 8 gates × 10 capacity = 80
    const tightCrowd: GateCrowd[] = [
      { gateId: "Gate G1", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
      { gateId: "Gate G2", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
      { gateId: "Gate G3", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
      { gateId: "Gate G4", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
      { gateId: "Gate G5", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
      { gateId: "Gate G6", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
      { gateId: "Gate G7", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
      { gateId: "Gate G8", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
    ];

    const users = generateMockUsers(100);

    const result = staggerEgress(users, tightCrowd, Date.now());

    // Only 80 can be assigned, 20 deferred
    expect(result.deferredCount).toBeGreaterThan(0);
    expect(result.assignments.filter((a) => a.deferred).length).toBe(result.deferredCount);
  });

  test("earlier-positioned users get earlier slots", () => {
    const now = Date.now();
    const users = [
      {
        userId: "close",
        etaToGate: { "Gate G1": 2, "Gate G2": 10, "Gate G3": 15, "Gate G4": 12 },
        earliestArrival: { "Gate G1": 2 * 60_000, "Gate G2": 10 * 60_000, "Gate G3": 15 * 60_000, "Gate G4": 12 * 60_000 },
      },
      {
        userId: "far",
        etaToGate: { "Gate G1": 12, "Gate G2": 8, "Gate G3": 5, "Gate G4": 10 },
        earliestArrival: { "Gate G1": 12 * 60_000, "Gate G2": 8 * 60_000, "Gate G3": 5 * 60_000, "Gate G4": 10 * 60_000 },
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
