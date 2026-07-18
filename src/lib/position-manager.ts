/**
 * PositionManager — deep module for all stadium-position math.
 *
 * Consolidates gate geometry + distance + position parsing that was
 * duplicated across egress-planner.ts and egress-stagger.ts. This is the
 * single source of truth for coordinate logic so callers (egress planner,
 * stagger, tracking API) hit one interface instead of re-deriving geometry.
 *
 * Geometry is derived from the canonical GATES config (venue-config.ts),
 * eliminating the duplicate GATE_POSITIONS maps.
 */

import { GATES } from "@/lib/venue-config";

/** A 2D point in stadium-center-relative meters. */
export interface Position2D {
  x: number;
  y: number;
}

const GATE_POSITION_MAP: Record<string, Position2D> = Object.fromEntries(
  GATES.map((g) => [g.id, { x: g.x, y: g.y }]),
);

const WALK_SPEED_M_PER_MIN = 80;

export class PositionManager {
  /** All gate ids. */
  static getGateIds(): string[] {
    return GATES.map((g) => g.id);
  }

  /** Coordinate of a gate (stadium-center-relative meters). */
  static gateToPosition(gateId: string): Position2D {
    const pos = GATE_POSITION_MAP[gateId];
    if (!pos) return { x: 0, y: 0 }; // unknown → center (worst case)
    return { x: pos.x, y: pos.y };
  }

  /** Euclidean distance between two points (meters). */
  static distance(a: Position2D, b: Position2D): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  /** Walking distance from a gate to a coordinate (meters). */
  static distanceFromGate(gateId: string, point: Position2D): number {
    return PositionManager.distance(PositionManager.gateToPosition(gateId), point);
  }

  /** Walking ETA from a coordinate to a gate (minutes, rounded up). */
  static etaMinutes(gateId: string, point: Position2D): number {
    const distM = PositionManager.distanceFromGate(gateId, point);
    return Math.ceil(distM / WALK_SPEED_M_PER_MIN);
  }

  /** Map a user's last-known position to a 2D coordinate.
   *  Accepts polar {angle, radius}, {sector, subsection}, or {x, y}. */
  static parse(input: unknown): Position2D {
    if (!input || typeof input !== "object") {
      return { x: 0, y: 0 };
    }

    const pos = input as Record<string, unknown>;

    if (typeof pos.angle === "number" && typeof pos.radius === "number") {
      return {
        x: Math.cos(pos.angle) * pos.radius,
        y: Math.sin(pos.angle) * pos.radius,
      };
    }

    if (typeof pos.sector === "string" && typeof pos.subsection === "number") {
      return PositionManager.userSectorToPosition(pos.sector, pos.subsection);
    }

    if (typeof pos.x === "number" && typeof pos.y === "number") {
      return { x: pos.x, y: pos.y };
    }

    return { x: 0, y: 0 };
  }

  /** Convert a sector + subsection to a polar-derived coordinate. */
  static userSectorToPosition(sector: string, subsection: number): Position2D {
    const sectorAngles: Record<string, number> = {
      NE: Math.PI / 4,
      SE: -Math.PI / 4,
      SW: -3 * Math.PI / 4,
      NW: 3 * Math.PI / 4,
    };
    const angle = sectorAngles[sector.toUpperCase()] ?? 0;
    const radius = 50 + subsection * 50;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  }
}

/** Backwards-compatible alias for existing callers (parseUserPosition). */
export const parseUserPosition = PositionManager.parse;

/** Backwards-compatible alias (gateToPosition). */
export const gateToPosition = PositionManager.gateToPosition;

/** Backwards-compatible alias (distance). */
export const distanceBetween = PositionManager.distance;
