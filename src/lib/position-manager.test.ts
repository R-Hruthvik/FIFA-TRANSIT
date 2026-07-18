import { PositionManager, parseUserPosition } from "./position-manager";

describe("PositionManager", () => {
  it("resolves gate coordinates from canonical config", () => {
    const g1 = PositionManager.gateToPosition("Gate G1");
    expect(g1).toEqual({ x: 200, y: 0 });
  });

  it("returns center for unknown gate", () => {
    expect(PositionManager.gateToPosition("nope")).toEqual({ x: 0, y: 0 });
  });

  it("parses polar coordinates", () => {
    const p = PositionManager.parse({ angle: 0, radius: 100 });
    expect(p.x).toBeCloseTo(100);
    expect(p.y).toBeCloseTo(0);
  });

  it("parses sector + subsection", () => {
    const p = PositionManager.parse({ sector: "NE", subsection: 1 });
    expect(p.x).toBeCloseTo(Math.cos(Math.PI / 4) * 100);
    expect(p.y).toBeCloseTo(Math.sin(Math.PI / 4) * 100);
  });

  it("parses explicit x,y", () => {
    expect(PositionManager.parse({ x: 5, y: -7 })).toEqual({ x: 5, y: -7 });
  });

  it("falls back to center on garbage input", () => {
    expect(parseUserPosition(null)).toEqual({ x: 0, y: 0 });
    expect(parseUserPosition("garbage")).toEqual({ x: 0, y: 0 });
  });

  it("computes distance between two points", () => {
    expect(PositionManager.distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });

  it("computes ETA minutes from a coordinate to a gate", () => {
    const eta = PositionManager.etaMinutes("Gate G1", { x: 200, y: 80 });
    // distance sqrt(0^2 + 80^2)=80m → ceil(80/80)=1 min
    expect(eta).toBe(1);
  });
});
