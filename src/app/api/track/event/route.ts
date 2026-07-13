/**
 * POST /api/track/event — Position event ingestion endpoint
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D1 — Real sources (fan/staff phones)
 * D3 — Events, not GPS streams; geofence + BLE beacon hybrid; opt-in
 *
 * Accepts position events from fan/staff phones:
 *  - Idempotent (deduped by eventId)
 *  - Rate-limited per user (basic in-memory sliding window)
 *  - Stored to MongoDB with TTL index for retention
 *  - Triggers change stream for live aggregation
 */

import { NextResponse } from "next/server";
import { clientPromise } from "@/lib/db";
import type { PositionEvent, TrackEventResponse } from "@/types/position";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";
const EVENTS_COLL = "position_events";

// ── Simple in-memory rate limiter (per user, sliding window) ──────────
// In production, replace with Redis or a dedicated rate-limit service.
// This is process-local and resets on cold start — acceptable for the
// demo / single-instance deployment described in the design.

interface RateBucket {
  timestamps: number[];
}

const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_EVENTS = 30; // max 30 events/min per user

const rateBuckets = new Map<string, RateBucket>();

function checkRateLimit(userId: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const bucket = rateBuckets.get(userId);

  if (!bucket) {
    rateBuckets.set(userId, { timestamps: [now] });
    return { allowed: true };
  }

  // Prune old timestamps
  const cutoff = now - RATE_LIMIT_WINDOW_MS;
  bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);

  if (bucket.timestamps.length >= RATE_LIMIT_MAX_EVENTS) {
    const oldest = bucket.timestamps[0];
    const retryAfter = oldest + RATE_LIMIT_WINDOW_MS - now;
    return { allowed: false, retryAfterMs: Math.max(retryAfter, 1000) };
  }

  bucket.timestamps.push(now);
  return { allowed: true };
}

// ── Validation ─────────────────────────────────────────────────────────

function validateEvent(body: unknown): { ok: true; event: PositionEvent } | { ok: false; reason: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, reason: "Request body must be a JSON object" };
  }

  const b = body as Record<string, unknown>;

  const required = ["eventId", "userId", "gateId", "eventType", "timestamp"];
  for (const field of required) {
    if (!b[field]) {
      return { ok: false, reason: `Missing required field: ${field}` };
    }
  }

  const validTypes = ["geofence_enter", "geofence_exit", "beacon_nearby"];
  if (!validTypes.includes(b.eventType as string)) {
    return { ok: false, reason: `Invalid eventType: ${b.eventType}` };
  }

  // Validate eventId format (UUID-ish)
  if (typeof b.eventId !== "string" || b.eventId.length < 8) {
    return { ok: false, reason: "eventId must be a non-empty string (UUID recommended)" };
  }

  // Validate timestamp is reasonable (not in the future, not too old)
  const ts = Number(b.timestamp);
  const now = Date.now();
  if (isNaN(ts) || ts > now + 60_000) {
    return { ok: false, reason: "timestamp must be a valid unix-ms not in the future" };
  }
  if (ts < now - 24 * 60 * 60 * 1000) {
    return { ok: false, reason: "timestamp too old (max 24h skew)" };
  }

  return {
    ok: true,
    event: {
      eventId: b.eventId as string,
      userId: b.userId as string,
      gateId: b.gateId as string,
      eventType: b.eventType as PositionEvent["eventType"],
      timestamp: ts,
      beaconId: b.beaconId as string | undefined,
      rssi: b.rssi as number | undefined,
      distanceMeters: b.distanceMeters as number | undefined,
      deviceHash: b.deviceHash as string | undefined,
    },
  };
}

// ── Route handler ──────────────────────────────────────────────────────

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    // 1. Parse & validate
    const body = await request.json();
    const validation = validateEvent(body);

    if (!validation.ok) {
      const reqEventId = (body as Record<string, unknown>).eventId;
      return NextResponse.json(
        { accepted: false, eventId: typeof reqEventId === "string" ? reqEventId : "unknown", reason: validation.reason } satisfies TrackEventResponse,
        { status: 400 },
      );
    }

    const event = validation.event;

    // 2. Rate limit
    const rateCheck = checkRateLimit(event.userId);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          accepted: false,
          eventId: event.eventId,
          reason: `Rate limit exceeded. Retry after ${Math.ceil((rateCheck.retryAfterMs || 1000) / 1000)}s`,
        } satisfies TrackEventResponse,
        { status: 429, headers: { "Retry-After": String(Math.ceil((rateCheck.retryAfterMs || 1000) / 1000)) } },
      );
    }

    // 3. Idempotency check (dedup)
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const coll = db.collection(EVENTS_COLL);

    const existing = await coll.findOne({ eventId: event.eventId });
    if (existing) {
      return NextResponse.json(
        {
          accepted: true,
          eventId: event.eventId,
          deduplicated: true,
          reason: "Event already processed",
        } satisfies TrackEventResponse,
      );
    }

    // 4. Store event (append-only)
    // We DO NOT store deviceHash long-term — it's only used for rate-limiting
    // in this request and discarded. The userId is pseudonymized.
    const { deviceHash: _omit, ...storable } = event;

    await coll.insertOne({
      ...storable,
      receivedAt: new Date(),
    });

    // 5. Trigger aggregation (fire-and-forget; change stream will also pick this up)
    // The aggregation runs on-read in the gate_crowd query endpoint, so we
    // don't block this request with computation.
    // However, we can optionally signal a background worker here if needed.

    return NextResponse.json(
      {
        accepted: true,
        eventId: event.eventId,
      } satisfies TrackEventResponse,
    );
  } catch (error) {
    console.error("Track event ingestion error:", error);
    return NextResponse.json(
      { accepted: false, eventId: "unknown", reason: "Internal server error" } satisfies TrackEventResponse,
      { status: 500 },
    );
  }
}
