import { getGate, getBeacon, isKnownGate, GATES, BEACONS, GATE_IDS } from "./venue-config";

describe("Venue configuration helpers", () => {
  it("should list gate configs and identify active gate ids", () => {
    expect(GATES.length).toBe(8);
    expect(GATE_IDS.length).toBe(8);
    expect(GATE_IDS).toContain("Gate G1");
  });

  it("should look up gate details by id", () => {
    const gate = getGate("Gate G1");
    expect(gate).toBeDefined();
    expect(gate!.label).toBe("Gate G1");
    expect(gate!.x).toBe(200);

    const missing = getGate("Gate Unknown");
    expect(missing).toBeUndefined();
  });

  it("should check if gate id is known", () => {
    expect(isKnownGate("Gate G2")).toBe(true);
    expect(isKnownGate("Gate G9")).toBe(false);
  });

  it("should look up BLE beacon details by beaconId", () => {
    const beacon = getBeacon("beacon-gateg1");
    expect(beacon).toBeDefined();
    expect(beacon!.gateId).toBe("Gate G1");

    const missing = getBeacon("beacon-unknown");
    expect(missing).toBeUndefined();
  });
});
