import { summarizeGate, computeConfidence, CONFIDENCE_THRESHOLD } from "@/lib/crowd-model";

describe("crowd-aggregator: gate classification", () => {
  it("marks a gate critical when at/above 80% capacity", () => {
    const s = summarizeGate("Gate G1", 850, 1000, 0.9);
    expect(s.status).toBe("critical");
    expect(s.avoid).toBe(true);
    expect(s.capacityPct).toBe(85);
  });

  it("marks a gate busy between 50% and 80%", () => {
    const s = summarizeGate("Gate G2", 550, 1000, 0.9);
    expect(s.status).toBe("busy");
    expect(s.avoid).toBe(false);
  });

  it("recommends an uncrowded, high-confidence gate", () => {
    const s = summarizeGate("Gate G3", 100, 1000, 0.9);
    expect(s.status).toBe("open");
    expect(s.recommended).toBe(true);
  });

  it("does not recommend a low-confidence gate even if empty", () => {
    const s = summarizeGate("Gate G4", 50, 1000, CONFIDENCE_THRESHOLD - 0.1);
    expect(s.recommended).toBe(false);
  });

  it("caps capacityPct at 100", () => {
    const s = summarizeGate("Gate G5", 5000, 1000, 0.9);
    expect(s.capacityPct).toBe(100);
  });
});

describe("crowd-aggregator: confidence model", () => {
  it("is zero with no opt-in coverage", () => {
    expect(computeConfidence(0, 0)).toBe(0);
  });

  it("rises with opt-in coverage and fresh data", () => {
    const low = computeConfidence(0.05, 0);
    const mid = computeConfidence(0.15, 0);
    const high = computeConfidence(0.3, 0);
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(mid);
    expect(high).toBeLessThanOrEqual(1);
  });

  it("discounts confidence for stale data", () => {
    const fresh = computeConfidence(0.3, 1000);
    const stale = computeConfidence(0.3, 5 * 60_000);
    expect(stale).toBeLessThan(fresh);
  });
});
