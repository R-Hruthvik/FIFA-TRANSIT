/**
 * GET /api/track/setup — Initialize DB indexes + run anonymization sweep
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D9 — Privacy: TTL index + anonymization are hard requirements
 *
 * Idempotent: safe to call multiple times. Creates indexes if missing
 * and runs an anonymization pass on old data.
 *
 * In production this would be a scheduled job (e.g., Vercel Cron),
 * not an HTTP endpoint. For development, call it manually once after
 * deploying, or from a CI step.
 */

import { NextResponse } from "next/server";
import { ensureIndexes } from "@/lib/mongo-indexes";
import { anonymizeAndAggregate } from "@/lib/privacy";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureIndexes();
    await anonymizeAndAggregate();

    return NextResponse.json({
      ok: true,
      message: "Indexes created and anonymization sweep completed",
    });
  } catch (error) {
    console.error("Setup error:", error);
    return NextResponse.json(
      { ok: false, error: String(error) },
      { status: 500 },
    );
  }
}
