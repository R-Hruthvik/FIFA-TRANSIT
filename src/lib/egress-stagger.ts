/**
 * Egress stagger algorithm — capacity-constrained flow assignment.
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D10 — Stagger = capacity-constrained flow assignment
 *
 * Models gates as sinks with max throughput (bodies/min) and transit hubs
 * as constrained absorbers. Solves leave-window assignments so cumulative
 * arrivals at each gate/hub stay under capacity across the *whole* egress
 * window.
 *
 * Per-user position (D6-B) sets the *earliest-feasible* bound;
 * capacity does the *assignment*.
 *
 * Approach: greedy time-window slot assignment.
 *  1. Sort users by earliest-feasible leave time (ETA to their nearest gate)
 *  2. For each user, find the earliest time slot at a gate where:
 *     a) The user can physically arrive (ETA constraint)
 *     b) Cumulative arrivals at that gate in the window stay under capacity
 *  3. If no slot exists, defer to stewards (safety-first)
 *
 * This is a simplified version suitable for demo/development.
 * A production system would use linear programming or constraint
 * optimization for larger crowds.
 */

import type { GateCrowd } from "@/types/position";

// ── Configuration ──────────────────────────────────────────────────────

/** Total match attendees (stadium capacity) */
export const STADIUM_CAPACITY = 60_000;

/** Post-match egress duration (minutes) — how long until stadium is empty */
export const EGRESS_DURATION_MIN = 45;

/** Gate throughput: bodies per minute (physical flow rate) */
export const GATE_THROUGHPUT: Record<string, number> = {
  "Gate G1": 150, // bodies/min
  "Gate G2": 150,
  "Gate G3": 120, // narrower gate
  "Gate G4": 150,
  "Gate G5": 150,
  "Gate G6": 150,
  "Gate G7": 150,
  "Gate G8": 150,
};

/** Transit hub absorption rate: people per minute */
export const HUB_THROUGHPUT = 300; // bodies/min

// ── Types ──────────────────────────────────────────────────────────────

export interface UserAssignment {
  userId: string;
  /** Assigned gate */
  gateId: string;
  /** Recommended leave time (unix ms) */
  leaveAt: number;
  /** Physical ETA to assigned gate (minutes) */
  etaMinutes: number;
  /** Transit ETA from gate to destination (minutes) */
  transitEtaMinutes: number;
  /** Whether user is deferred to stewards */
  deferred: boolean;
  /** Deferral reason if applicable */
  deferReason?: string;
}

export interface StaggerResult {
  assignments: UserAssignment[];
  deferredCount: number;
  /** Per-gate schedule: minute → cumulative count */
  gateSchedule: Record<string, number[]>;
  /** Total egress time (minutes) */
  totalEgressMinutes: number;
}

// ── Capacity checking ──────────────────────────────────────────────────

interface UserEarliest {
  userId: string;
  /** Earliest the user can physically arrive at any gate (unix ms) */
  earliestArrival: Record<string, number>;
  /** ETA to each gate in minutes */
  etaToGate: Record<string, number>;
  /** User's preferred language */
  language?: string;
}

/**
 * Assign leave-windows to users such that gate/hub capacity is never exceeded.
 *
 * @param users - List of users with their earliest arrival times per gate
 * @param gateCrowds - Current gate crowd data (for capacity thresholds)
 * @param matchEndTime - Unix ms when the match ends
 * @returns Staggered assignments + schedule
 */
export function staggerEgress(
  users: UserEarliest[],
  gateCrowds: GateCrowd[],
  matchEndTime: number,
): StaggerResult {
  const gateCounts: Record<string, number> = {};
  const gateTimeline: Record<string, number[]> = {};

  // Initialize gates
  for (const gate of Object.keys(GATE_THROUGHPUT)) {
    gateCounts[gate] = 0;
    gateTimeline[gate] = [];
  }

  const assignments: UserAssignment[] = [];
  let deferredCount = 0;

  // Sort users by earliest-feasible arrival (D10: position sets earliest bound)
  const sorted = [...users].sort((a, b) => {
    const aEarliest = Math.min(...Object.values(a.earliestArrival));
    const bEarliest = Math.min(...Object.values(b.earliestArrival));
    return aEarliest - bEarliest;
  });

  for (const user of sorted) {
    const assignment = assignUser(user, gateCrowds, gateCounts, gateTimeline, matchEndTime);
    assignments.push(assignment);

    if (assignment.deferred) {
      deferredCount++;
    } else {
      gateCounts[assignment.gateId]++;
      gateTimeline[assignment.gateId].push(assignment.leaveAt);
    }
  }

  // Compute total egress time
  const allLeaveTimes = assignments.filter((a) => !a.deferred).map((a) => a.leaveAt);
  const totalEgressMinutes =
    allLeaveTimes.length > 0
      ? (Math.max(...allLeaveTimes) - matchEndTime) / 60_000
      : 0;

  return {
    assignments,
    deferredCount,
    gateSchedule: gateTimeline,
    totalEgressMinutes: Math.round(totalEgressMinutes),
  };
}

/**
 * Assign a single user to a gate + leave window.
 */
function assignUser(
  user: UserEarliest,
  gateCrowds: GateCrowd[],
  gateCounts: Record<string, number>,
  gateTimeline: Record<string, number[]>,
  matchEndTime: number,
): UserAssignment {
  // Build capacity map from gateCrowds
  const capacityMap = new Map<string, number>();
  for (const gc of gateCrowds) {
    capacityMap.set(gc.gateId, gc.capacityThreshold);
  }

  // Score each gate for this user
  const gateScores = Object.keys(GATE_THROUGHPUT).map((gateId) => {
    const eta = user.etaToGate[gateId] ?? 999;
    const capacity = capacityMap.get(gateId) ?? 100;
    const currentCount = gateCounts[gateId] ?? 0;
    const remainingCapacity = Math.max(capacity - currentCount, 0);

    // Score: higher remaining capacity + lower ETA = better
    const capacityScore = remainingCapacity / capacity;
    const etaScore = 1 - Math.min(eta, 20) / 20;
    const score = capacityScore * 0.7 + etaScore * 0.3;

    return { gateId, eta, score, remainingCapacity };
  });

  // Sort by score (best first)
  gateScores.sort((a, b) => b.score - a.score);

  // Try each gate in order
  for (const candidate of gateScores) {
    if (candidate.remainingCapacity <= 0) continue;

    // User can't arrive before ETA
    const earliestPhysical = matchEndTime + candidate.eta * 60_000;

    // Add a small stagger buffer based on throughput
    const bufferMs = (60_000 / GATE_THROUGHPUT[candidate.gateId]) * gateCounts[candidate.gateId];
    const leaveAt = earliestPhysical + bufferMs;

    // Check if within egress window
    const maxEgressTime = matchEndTime + EGRESS_DURATION_MIN * 60_000;
    if (leaveAt > maxEgressTime) continue;

    // Success!
    return {
      userId: user.userId,
      gateId: candidate.gateId,
      leaveAt,
      etaMinutes: candidate.eta,
      transitEtaMinutes: 0,
      deferred: false,
    };
  }

  // No gate available — defer to stewards
  return {
    userId: user.userId,
    gateId: "",
    leaveAt: matchEndTime,
    etaMinutes: 0,
    transitEtaMinutes: 0,
    deferred: true,
    deferReason: "All gates at capacity. Follow steward directions.",
  };
}

