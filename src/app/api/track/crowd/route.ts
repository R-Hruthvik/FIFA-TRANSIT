/**
 * GET /api/track/crowd — Latest gate crowd data
 *
 * Returns aggregated crowd counts + confidence for each gate.
 * Used by StaffHub dashboard and SSE push source.
 */

import { NextResponse } from "next/server";
import { aggregateCrowd } from "@/lib/crowd-aggregator";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { gateCrowds } = await aggregateCrowd();
    return NextResponse.json({ gates: gateCrowds });
  } catch (error) {
    console.error("Crowd aggregation error:", error);
    return NextResponse.json(
      { gates: [], error: "Aggregation failed" },
      { status: 500 },
    );
  }
}
