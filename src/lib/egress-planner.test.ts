/**
 * Unit tests for egress planning logic.
 * Run with: npx jest src/lib/egress-planner.test.ts
 */

import { generateEgressPlan } from "./egress-planner";
import type { GateCrowd } from "@/types/position";

function makeCrowd(
  gateId: string,
  count: number,
  confidence: number,
): GateCrowd {
  return {
    gateId,
    count,
    confidence,
    optInCount: 100,
    timestamp: Date.now(),
    capacityThreshold: 1000,
  };
}

describe("generateEgressPlan", () => {
  test("picks lowest-capacity gate with sufficient confidence", () => {
    const crowds = [
      makeCrowd("Gate A", 200, 0.8), // 20%
      makeCrowd("Gate B", 800, 0.8), // 80% - avoid
      makeCrowd("Gate C", 500, 0.8), // 50%
      makeCrowd("Gate D", 100, 0.8), // 10% - best
    ];

    const result = generateEgressPlan({
      userPosition: { sector: "NE", subsection: 1 },
      gateCrowds: crowds,
      language: "en",
    });

    expect(result.deferred).toBe(false);
    expect(result.plan?.gateId).toBe("Gate D");
  });

  test("defers to stewards when confidence is too low everywhere", () => {
    const crowds = [
      makeCrowd("Gate A", 200, 0.1),
      makeCrowd("Gate B", 800, 0.1),
      makeCrowd("Gate C", 500, 0.1),
      makeCrowd("Gate D", 100, 0.1),
    ];

    const result = generateEgressPlan({
      userPosition: { sector: "NE", subsection: 1 },
      gateCrowds: crowds,
    });

    expect(result.deferred).toBe(true);
    expect(result.plan?.deferToStewards).toBe(true);
    expect(result.plan?.instruction).toContain("steward");
  });

  test("produces multilingual instruction", () => {
    const crowds = [
      makeCrowd("Gate A", 200, 0.8),
      makeCrowd("Gate B", 800, 0.8),
      makeCrowd("Gate C", 500, 0.8),
      makeCrowd("Gate D", 100, 0.8),
    ];

    const es = generateEgressPlan({
      userPosition: { sector: "SE", subsection: 2 },
      gateCrowds: crowds,
      language: "es",
    });

    expect(es.plan?.instruction).toContain("Salga");

    const zh = generateEgressPlan({
      userPosition: { sector: "NW", subsection: 3 },
      gateCrowds: crowds,
      language: "zh",
    });

    expect(zh.plan?.instruction).toContain("离开");
  });

  test("never recommends a critical (>80%) gate if alternatives exist", () => {
    const crowds = [
      makeCrowd("Gate A", 900, 0.8), // 90% - critical
      makeCrowd("Gate B", 850, 0.8), // 85% - critical
      makeCrowd("Gate C", 200, 0.8), // 20%
      makeCrowd("Gate D", 300, 0.8), // 30%
    ];

    const result = generateEgressPlan({
      userPosition: { sector: "NE", subsection: 1 },
      gateCrowds: crowds,
    });

    expect(result.plan?.gateId).toBe("Gate C");
  });
});
