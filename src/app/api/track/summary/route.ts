/**
 * GET /api/track/summary — Fan-facing gate summary
 *
 * Returns a simplified summary of gate statuses for broadcasting.
 * Gates below the confidence threshold are excluded (D9: we don't guess).
 *
 * Response:
 *   { summary: GateSummary[] }
 *
 * Each GateSummary has:
 *   gateId, capacityPct, status ("open" | "busy" | "critical"),
 *   recommended?, avoid?
 */

import { NextResponse } from "next/server";
import { getGateSummary } from "@/lib/crowd-aggregator";

export const runtime = "nodejs";

export async function GET() {
  try {
    const summary = await getGateSummary();
    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Summary error:", error);
    return NextResponse.json(
      { summary: [], error: "Summary generation failed" },
      { status: 500 },
    );
  }
}
