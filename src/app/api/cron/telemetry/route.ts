import { NextResponse } from "next/server";
import { buildLiveTelemetry, upsertTelemetry } from "@/lib/telemetry-writer";

export const runtime = "nodejs";

/**
 * GET /api/cron/telemetry — Cron-triggered telemetry refresh.
 *
 * Called periodically (e.g. every 5 minutes via Vercel Cron Jobs).
 * Guarded by CRON_SECRET Bearer token.
 *
 * Does two things:
 * 1. Reloads venue config from DB (picks up admin gates/hub changes)
 * 2. Builds fresh telemetry and persists it
 */
export async function GET(request: Request) {
  // Auth: Bearer token must match CRON_SECRET
  const authHeader = request.headers.get("authorization") || "";
  const expected = process.env.CRON_SECRET;

  if (!authHeader.startsWith("Bearer ") || !expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7).trim();
  if (token !== expected) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  try {
    // Build and persist fresh telemetry
    const telemetry = await buildLiveTelemetry();
    if (telemetry) {
      await upsertTelemetry(telemetry);
    }

    return NextResponse.json({
      success: true,
      hasData: telemetry !== null,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Cron telemetry refresh failed:", error);
    return NextResponse.json(
      { success: false, error: "Telemetry refresh failed" },
      { status: 500 },
    );
  }
}
