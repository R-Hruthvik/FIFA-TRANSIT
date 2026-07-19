import { NextResponse } from "next/server";
import { aggregateCrowd } from "@/lib/crowd-aggregator";
import { getLiveTelemetry } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/telemetry - Returns real-time stadium telemetry
 * 
 * Priority order:
 * 1. Real MongoDB telemetry data (if available and recent)
 * 2. Aggregated crowd data from position events
 * 3. null (UI should handle gracefully)
 * 
 * Design principle: Never return demo/fake data in production.
 * Return null to let UI show "unavailable" state instead of misleading data.
 */
export async function GET() {
  try {
    // First, try to get live telemetry from database
    const dbTelemetry = await getLiveTelemetry();
    
    if (dbTelemetry) {
      // Validate telemetry is recent (within last 5 minutes)
      const now = Date.now();
      const telemetryAge = now - new Date(dbTelemetry.timestamp || now).getTime();
      const MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
      
      if (telemetryAge < MAX_AGE_MS) {
        return NextResponse.json(dbTelemetry);
      }
      // Telemetry is stale, fall through to aggregated data
    }

    // Fallback: aggregate from position events
    const crowd = await aggregateCrowd();

    // Only return data when there are actual people present (non-zero gate counts).
    const hasRealPresence = crowd.gateCrowds.some((g) => g.count > 0);
    if (!hasRealPresence) {
      return NextResponse.json(null);
    }

    // We have real crowd counts but no real gate labels, hub names, or weather data.
    // Return null rather than fabricating labels — UI shows "unavailable" instead.
    return NextResponse.json(null);
  } catch (error) {
    // Log error for debugging but return null to prevent breaking UI
    console.error("Telemetry API error:", error instanceof Error ? error.message : error);
    return NextResponse.json(null);
  }
}
