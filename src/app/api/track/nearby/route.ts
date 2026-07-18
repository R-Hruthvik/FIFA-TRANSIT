/**
 * GET /api/track/nearby — Per-user "nearby crowd" lookup.
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D2 — crowd = phone-cluster inference, D9 — confidence gating.
 *
 * Given a user id, returns how many other opted-in app users are co-located
 * with them (same crowd cluster) and the nearest gate. The server computes
 * this from the shared position-event stream — no phone-to-phone Bluetooth.
 *
 * Query params: userId (required, pseudonymous id)
 * Response: { nearbyCount, clusterSize, gateId } | { nearbyCount: 0 }
 */

import { NextResponse } from "next/server";
import { aggregateCrowd } from "@/lib/crowd-aggregator";
import { getUserCluster } from "@/lib/crowd-clusters";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const { clusters } = await aggregateCrowd();
    const result = await getUserCluster(userId, clusters);

    if (!result) {
      return NextResponse.json({ nearbyCount: 0, clusterSize: 0, gateId: null });
    }

    return NextResponse.json({
      nearbyCount: result.nearbyCount,
      clusterSize: result.clusterSize,
      gateId: result.gateId,
    });
  } catch (error) {
    console.error("Nearby lookup error:", error);
    return NextResponse.json({ nearbyCount: 0, clusterSize: 0, gateId: null }, { status: 500 });
  }
}
