/**
 * GET /api/track/staff — Staff aggregate view + enforcement data
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D11 — Enforcement = both, stewards as hard backstop
 *      Staff get the live aggregate dashboard to enforce physically +
 *      trigger the D9 deferral when a gate breaches capacity live.
 *
 * Returns:
 *   gates: GateCrowd[] with confidence
 *   summary: GateSummary[]
 *   alerts: active alerts (critical + low-confidence)
 *   staggerStatus: whether egress assignment is active
 *   enforceableGates: gates where stewards can intervene
 */

import { NextResponse } from "next/server";
import { aggregateCrowd } from "@/lib/crowd-aggregator";
import type { GateCrowd, GateSummary } from "@/types/position";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { gateCrowds, summary } = await aggregateCrowd();

    // Build alerts
    const alerts: Array<{
      type: "critical" | "low_confidence";
      gateId: string;
      message: string;
      severity: "critical" | "warning";
    }> = [];

    for (const gc of gateCrowds) {
      const pct = Math.round((gc.count / gc.capacityThreshold) * 100);

      if (pct >= 80) {
        alerts.push({
          type: "critical",
          gateId: gc.gateId,
          message: `${gc.gateId} at ${pct}% capacity — enforce flow control`,
          severity: "critical",
        });
      }

      if (gc.confidence < 0.35) {
        alerts.push({
          type: "low_confidence",
          gateId: gc.gateId,
          message: `${gc.gateId}: low data confidence — defer routing to stewards`,
          severity: "warning",
        });
      }
    }

    // Stagger status (D10)
    const totalUsers = gateCrowds.reduce((sum, g) => sum + g.count, 0);
    const staggerStatus = {
      active: totalUsers > 0,
      totalTrackedUsers: totalUsers,
      egressWindowMinutes: 45,
      capacityHeadroom: 0, // TODO: compute from stagger algorithm
    };

    return NextResponse.json({
      gates: gateCrowds,
      summary,
      alerts,
      staggerStatus,
      enforceableGates: gateCrowds
        .filter((g) => (g.count / g.capacityThreshold) >= 0.8)
        .map((g) => g.gateId),
    });
  } catch (error) {
    console.error("Staff aggregate error:", error);
    return NextResponse.json(
      { gates: [], summary: [], alerts: [], staggerStatus: { active: false } },
      { status: 500 },
    );
  }
}
