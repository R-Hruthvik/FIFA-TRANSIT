import { staggerEgress } from "./egress-stagger";
import type { GateCrowd } from "@/types/position";

// ── Helpers ────────────────────────────────────────────────────────────

function buildUser(index: number, baseEtaMin: number) {
  const gateIds = ["Gate G1", "Gate G2", "Gate G3", "Gate G4", "Gate G5", "Gate G6", "Gate G7", "Gate G8"];
  const etaToGate: Record<string, number> = {};
  const earliestArrival: Record<string, number> = {};
  for (const gid of gateIds) {
    const eta = baseEtaMin + (index % 5);
    etaToGate[gid] = eta;
    earliestArrival[gid] = eta * 60_000;
  }
  return { userId: `user-${index}`, earliestArrival, etaToGate };
}

function buildUsers(count: number) {
  return Array.from({ length: count }, (_, i) => buildUser(i, 2 + (i % 10)));
}

const DEFAULT_CROWD: GateCrowd[] = [
  { gateId: "Gate G1", count: 200, confidence: 0.8, optInCount: 500, timestamp: Date.now(), capacityThreshold: 1000 },
  { gateId: "Gate G2", count: 200, confidence: 0.8, optInCount: 500, timestamp: Date.now(), capacityThreshold: 1000 },
  { gateId: "Gate G3", count: 200, confidence: 0.8, optInCount: 500, timestamp: Date.now(), capacityThreshold: 1000 },
  { gateId: "Gate G4", count: 200, confidence: 0.8, optInCount: 500, timestamp: Date.now(), capacityThreshold: 1000 },
  { gateId: "Gate G5", count: 200, confidence: 0.8, optInCount: 500, timestamp: Date.now(), capacityThreshold: 1000 },
  { gateId: "Gate G6", count: 200, confidence: 0.8, optInCount: 500, timestamp: Date.now(), capacityThreshold: 1000 },
  { gateId: "Gate G7", count: 200, confidence: 0.8, optInCount: 500, timestamp: Date.now(), capacityThreshold: 1000 },
  { gateId: "Gate G8", count: 200, confidence: 0.8, optInCount: 500, timestamp: Date.now(), capacityThreshold: 1000 },
];

const TIGHT_CROWD: GateCrowd[] = [
  { gateId: "Gate G1", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
  { gateId: "Gate G2", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
  { gateId: "Gate G3", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
  { gateId: "Gate G4", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
  { gateId: "Gate G5", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
  { gateId: "Gate G6", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
  { gateId: "Gate G7", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
  { gateId: "Gate G8", count: 10, confidence: 0.8, optInCount: 50, timestamp: Date.now(), capacityThreshold: 10 },
];

// ── Tests ──────────────────────────────────────────────────────────────

describe("staggerEgress", () => {
  test("assigns all users when capacity allows", () => {
    const users = buildUsers(100);
    const result = staggerEgress(users, DEFAULT_CROWD, Date.now());

    expect(result.deferredCount).toBe(0);
    expect(result.assignments.length).toBe(100);
    expect(result.assignments.every((a) => !a.deferred)).toBe(true);
  });

  test("defers users when gates are over capacity", () => {
    const users = buildUsers(100);
    const result = staggerEgress(users, TIGHT_CROWD, Date.now());

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

    const result = staggerEgress(users, DEFAULT_CROWD, now);

    const close = result.assignments.find((a) => a.userId === "close")!;
    const far = result.assignments.find((a) => a.userId === "far")!;

    expect(close.leaveAt).toBeLessThanOrEqual(far.leaveAt);
  });
});
