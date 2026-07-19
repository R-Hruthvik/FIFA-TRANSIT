import { NextResponse } from "next/server";
import { aggregateCrowd } from "@/lib/crowd-aggregator";

export const runtime = "nodejs";

export async function GET() {
  try {
    const crowd = await aggregateCrowd();

    // Only return data when there are actual people present (non-zero gate counts).
    const hasRealPresence = crowd.gateCrowds.some((g) => g.count > 0);
    if (!hasRealPresence) {
      return NextResponse.json(null);
    }

    // We have real crowd counts but no real gate labels, hub names, or weather data.
    // Return null rather than fabricating labels — UI shows "unavailable" instead.
    return NextResponse.json(null);
  } catch {
    return NextResponse.json(null);
  }
}
