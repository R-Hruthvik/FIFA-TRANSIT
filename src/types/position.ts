/**
 * Position event types for the real-time tracking system.
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D1 — Real sources (fan phones + staff phones, not simulation)
 * D3 — Events, not GPS streams; geofence + BLE beacon hybrid; opt-in
 */

/** Types of position events we ingest */
export type PositionEventType = "geofence_enter" | "geofence_exit" | "beacon_nearby";

/** A single position event from a fan or staff phone */
export interface PositionEvent {
  /** Unique event ID for idempotency */
  eventId: string;
  /** User ID (anonymized/pseudonymized) */
  userId: string;
  /** Which gate this event relates to */
  gateId: string;
  /** Type of position event */
  eventType: PositionEventType;
  /** Unix timestamp (ms) when the event occurred */
  timestamp: number;
  /** BLE beacon ID if eventType is beacon_nearby */
  beaconId?: string;
  /** Signal strength (RSSI) if beacon event */
  rssi?: number;
  /** Approximate distance in meters if beacon event */
  distanceMeters?: number;
  /** Stadium-center-relative position in meters (for co-location clustering). */
  x?: number;
  /** Stadium-center-relative position in meters (for co-location clustering). */
  y?: number;
  /** Hashed device identifier for rate-limiting (not stored long-term) */
  deviceHash?: string;
}

/** Response from the event ingestion endpoint */
export interface TrackEventResponse {
  accepted: boolean;
  eventId: string;
  deduplicated?: boolean;
  reason?: string;
}

/** Aggregated crowd count at a single gate */
export interface GateCrowd {
  gateId: string;
  count: number;
  confidence: number; // 0–1
  optInCount: number;
  timestamp: number;
  capacityThreshold: number;
}

/** Per-user egress plan */
export interface EgressPlan {
  userId: string;
  /** Which gate to use */
  gateId: string;
  /** Recommended leave window (unix ms) */
  leaveAt: number;
  /** ETA from user position to gate (minutes) */
  etaMinutes: number;
  /** Gate capacity percentage (0–100) at time of planning */
  gateCapacityPct: number;
  /** Transit hub ETA from gate (minutes) */
  transitEtaMinutes: number;
  /** User's preferred language */
  language: string;
  /** Whether the plan is stale (needs refresh) */
  stale: boolean;
  /** If confidence was too low, route to stewards instead */
  deferToStewards: boolean;
  /** Human-readable instruction in the user's language */
  instruction: string;
  /** Version for cache invalidation */
  version: number;
}

/** Summary view of all gates for broadcasting */
export interface GateSummary {
  gateId: string;
  capacityPct: number;
  status: "open" | "busy" | "critical";
  recommended?: boolean;
  avoid?: boolean;
}
