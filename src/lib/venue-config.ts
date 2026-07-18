/**
 * Venue configuration — single source of truth for gates, beacons, and
 * crowd-detection thresholds.
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D1 — Real sources, D3 — events not GPS, D9 — confidence gating.
 *
 * Centralizing this fixes the gate-namespace mismatch where crowd-aggregator,
 * egress-planner and egress-stagger used "Gate G1..G8" while seed-events.ts
 * used "Gate A..D". Every detection/aggregation consumer imports from here.
 */

export interface GateConfig {
  /** Canonical gate id — must match what phones emit in events. */
  id: string;
  /** Human label for UI. */
  label: string;
  /** Stadium-center-relative position in meters (for ETA + distance math). */
  x: number;
  y: number;
  /** Physical crowd capacity (bodies) before critical. */
  capacity: number;
  /** Geofence radius in meters around (x, y) for geofence_enter. */
  geofenceRadiusM: number;
}

export interface BeaconConfig {
  /** BLE beacon id emitted in beacon_nearby events. */
  beaconId: string;
  /** Gate this beacon belongs to. */
  gateId: string;
  /** Stadium-center-relative position in meters. */
  x: number;
  y: number;
  /** Measured Tx power (RSSI at 1m) for path-loss distance estimation. */
  txPower: number;
}

/** Eight gates arranged radially around a 250m stadium. */
export const GATES: GateConfig[] = [
  { id: "Gate G1", label: "Gate G1", x: 200, y: 0, capacity: 1000, geofenceRadiusM: 60 },
  { id: "Gate G2", label: "Gate G2", x: 141, y: 141, capacity: 1000, geofenceRadiusM: 60 },
  { id: "Gate G3", label: "Gate G3", x: 0, y: 200, capacity: 800, geofenceRadiusM: 60 },
  { id: "Gate G4", label: "Gate G4", x: -141, y: 141, capacity: 1000, geofenceRadiusM: 60 },
  { id: "Gate G5", label: "Gate G5", x: -200, y: 0, capacity: 1000, geofenceRadiusM: 60 },
  { id: "Gate G6", label: "Gate G6", x: -141, y: -141, capacity: 1000, geofenceRadiusM: 60 },
  { id: "Gate G7", label: "Gate G7", x: 0, y: -200, capacity: 1000, geofenceRadiusM: 60 },
  { id: "Gate G8", label: "Gate G8", x: 141, y: -141, capacity: 1000, geofenceRadiusM: 60 },
];

/** One BLE beacon per gate (progressive enhancement; geofence is the MVP). */
export const BEACONS: BeaconConfig[] = GATES.map((g) => ({
  beaconId: `beacon-${g.id.replace(/\s+/g, "").toLowerCase()}`,
  gateId: g.id,
  x: g.x,
  y: g.y,
  txPower: -59,
}));

export const GATE_IDS: string[] = GATES.map((g) => g.id);

const gateById = new Map(GATES.map((g) => [g.id, g]));
const beaconById = new Map(BEACONS.map((b) => [b.beaconId, b]));

export function getGate(id: string): GateConfig | undefined {
  return gateById.get(id);
}

export function getBeacon(id: string): BeaconConfig | undefined {
  return beaconById.get(id);
}

export function isKnownGate(id: string): boolean {
  return gateById.has(id);
}

// ── Crowd detection tuning ──────────────────────────────────────────────

/** How far back (ms) an event counts as "active". */
export const LOOKBACK_WINDOW_MS = 5 * 60_000;

/** Grace period after geofence_exit before a user is dropped (decay). */
export const EXIT_GRACE_MS = 90_000;

/** Confidence below which we defer routing to stewards (D9). */
export const CONFIDENCE_THRESHOLD = 0.35;

/** Walk speed for ETA math (m/min). */
export const WALK_SPEED_M_PER_MIN = 80;

/** Stadium center is origin; radius used for synthetic positioning. */
export const STADIUM_RADIUS_M = 250;
