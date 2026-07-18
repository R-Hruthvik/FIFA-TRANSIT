import { clusterCrowd, latestUserPoints, PROXIMITY_RADIUS_M } from "@/lib/crowd-clusters-model";

describe("crowd-clusters: proximity clustering", () => {
  it("groups two nearby users into one cluster", () => {
    const points = [
      { userId: "a", x: 0, y: 0, newest: Date.now() },
      { userId: "b", x: 10, y: 0, newest: Date.now() },
    ];
    const clusters = clusterCrowd(points);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].size).toBe(2);
  });

  it("keeps far-apart users in separate clusters", () => {
    const points = [
      { userId: "a", x: 0, y: 0, newest: Date.now() },
      { userId: "b", x: 500, y: 0, newest: Date.now() },
    ];
    const clusters = clusterCrowd(points);
    expect(clusters).toHaveLength(2);
  });

  it("chains three users within radius into one cluster (transitive)", () => {
    const points = [
      { userId: "a", x: 0, y: 0, newest: Date.now() },
      { userId: "b", x: 20, y: 0, newest: Date.now() },
      { userId: "c", x: 40, y: 0, newest: Date.now() },
    ];
    const clusters = clusterCrowd(points);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].size).toBe(3);
  });

  it("returns no clusters when there are no points", () => {
    expect(clusterCrowd([])).toHaveLength(0);
  });
});

describe("crowd-clusters: latestUserPoints", () => {
  const now = Date.now();

  it("keeps the most recent position per user", () => {
    const events = [
      { userId: "a", x: 0, y: 0, timestamp: now - 1000, eventType: "geofence_enter" },
      { userId: "a", x: 50, y: 50, timestamp: now, eventType: "beacon_nearby" },
    ];
    const points = latestUserPoints(events);
    expect(points).toHaveLength(1);
    expect(points[0].x).toBe(50);
  });

  it("drops a user whose latest event is geofence_exit", () => {
    const events = [
      { userId: "a", x: 0, y: 0, timestamp: now - 1000, eventType: "geofence_enter" },
      { userId: "a", x: 0, y: 0, timestamp: now, eventType: "geofence_exit" },
    ];
    const points = latestUserPoints(events);
    expect(points).toHaveLength(0);
  });

  it("ignores events without coordinates", () => {
    const events = [
      { userId: "a", timestamp: now, eventType: "geofence_enter" },
    ];
    expect(latestUserPoints(events)).toHaveLength(0);
  });
});

describe("crowd-clusters: proximity radius", () => {
  it("respects the configured radius", () => {
    // Two users just outside the radius should not cluster.
    const r = PROXIMITY_RADIUS_M;
    const points = [
      { userId: "a", x: 0, y: 0, newest: Date.now() },
      { userId: "b", x: r + 5, y: 0, newest: Date.now() },
    ];
    expect(clusterCrowd(points)).toHaveLength(2);
  });
});
