/**
 * POST/GET /api/track/consent — Server-side consent store for crowd detection.
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D1 — opt-in only, D9 — privacy (consent persisted server-side).
 *
 * The client (consent.ts) calls this instead of importing privacy.ts
 * directly — that keeps the mongodb driver (Node-only) out of the browser
 * bundle.
 */

import { NextResponse } from "next/server";
import { hasConsent, recordConsent } from "@/lib/privacy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = body?.userId;
    const optedIn = Boolean(body?.optedIn);
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    await recordConsent(userId, optedIn);
    return NextResponse.json({ ok: true, userId, optedIn });
  } catch (error) {
    console.error("Consent record error:", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const userId = new URL(request.url).searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    const consented = await hasConsent(userId);
    return NextResponse.json({ userId, optedIn: consented });
  } catch (error) {
    console.error("Consent check error:", error);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
