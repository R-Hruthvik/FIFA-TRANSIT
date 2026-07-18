/**
 * POST /api/track/event — Position event ingestion endpoint
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D1 — Real sources (fan/staff phones), D3 — events not GPS.
 *
 * Accepts one PositionEvent or a batch { events: PositionEvent[] } from
 * fan/staff phones. Each event is:
 *  - Validated (schema + gate allowlist from venue-config)
 *  - Rate-limited per user (sliding window; Redis if configured, else memory)
 *  - Deduplicated by eventId (idempotent)
 *  - Stored append-only with a 24h TTL (privacy by design, D9)
 */

import { NextResponse } from "next/server";
import { clientPromise } from "@/lib/db";
import { isKnownGate } from "@/lib/venue-config";
import type { PositionEvent, TrackEventResponse } from "@/types/position";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";
const EVENTS_COLL = "position_events";

// ── Rate limiter (Redis if configured, else in-memory) ────────────────
// In production set RATE_LIMIT_REDIS_URL to use a shared store. The in-memory
// limiter is process-local and resets on cold start — fine for single-instance.

interface RateBucket {
  timestamps: number[];
}
const memoryBuckets = new Map<string, RateBucket>();

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_EVENTS = 30;

async function checkRateLimit(userId: string): Promise<{ allowed: boolean; retryAfterMs?: number }> {
  const now = Date.now();
  const redisUrl = process.env.RATE_LIMIT_REDIS_URL;

  if (redisUrl) {
    try {
      // Optional dependency — only loaded when RATE_LIMIT_REDIS_URL is set.
      // Typed loosely to avoid a hard dependency on @types/redis.
      interface RedisClient {
        zCount(key: string, min: number, max: number): Promise<number>;
        zRange(key: string, start: number, stop: number): Promise<string[]>;
        zAdd(key: string, member: { score: number; value: string }): Promise<unknown>;
        expire(key: string, seconds: number): Promise<unknown>;
      }
      interface RedisStatic {
        fromURL(url: string): RedisClient;
      }
      const redisModule = "redis";
      const { Redis } = (await import(redisModule)) as { Redis: RedisStatic };
      const redis = Redis.fromURL(redisUrl);
      const key = `ratelimit:track:${userId}`;
      const count = await redis.zCount(key, now - RATE_LIMIT_WINDOW_MS, now);
      if (count >= RATE_LIMIT_MAX_EVENTS) {
        const oldest = await redis.zRange(key, 0, 0);
        const retryAfter = (Number(oldest[0]) ?? now) + RATE_LIMIT_WINDOW_MS - now;
        return { allowed: false, retryAfterMs: Math.max(retryAfter, 1000) };
      }
      await redis.zAdd(key, { score: now, value: String(now) });
      await redis.expire(key, Math.ceil(RATE_LIMIT_WINDOW_MS / 1000));
      return { allowed: true };
    } catch {
      // Fall through to in-memory on Redis failure.
    }
  }

  const bucket = memoryBuckets.get(userId);
  if (!bucket) {
    memoryBuckets.set(userId, { timestamps: [now] });
    return { allowed: true };
  }
  bucket.timestamps = bucket.timestamps.filter((t) => t > now - RATE_LIMIT_WINDOW_MS);
  if (bucket.timestamps.length >= RATE_LIMIT_MAX_EVENTS) {
    const oldest = bucket.timestamps[0];
    return { allowed: false, retryAfterMs: Math.max(oldest + RATE_LIMIT_WINDOW_MS - now, 1000) };
  }
  bucket.timestamps.push(now);
  return { allowed: true };
}

// ── Validation ─────────────────────────────────────────────────────────

function validateEvent(b: Record<string, unknown>): { ok: true; event: PositionEvent } | { ok: false; reason: string } {
  const required = ["eventId", "userId", "gateId", "eventType", "timestamp"];
  for (const field of required) {
    if (!b[field]) return { ok: false, reason: `Missing required field: ${field}` };
  }

  const validTypes = ["geofence_enter", "geofence_exit", "beacon_nearby"];
  if (!validTypes.includes(b.eventType as string)) {
    return { ok: false, reason: `Invalid eventType: ${b.eventType}` };
  }

  // Gate must be in the venue allowlist (fixes namespace mismatch).
  if (!isKnownGate(b.gateId as string)) {
    return { ok: false, reason: `Unknown gateId: ${b.gateId}` };
  }

  if (typeof b.eventId !== "string" || b.eventId.length < 8) {
    return { ok: false, reason: "eventId must be a non-empty string (UUID recommended)" };
  }

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
      x: typeof b.x === "number" ? (b.x as number) : undefined,
      y: typeof b.y === "number" ? (b.y as number) : undefined,
      deviceHash: b.deviceHash as string | undefined,
    },
  };
}

// ── Route handler ──────────────────────────────────────────────────────

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();

    // Accept single event OR batch { events: [...] }.
    const bodyRecord = body as Record<string, unknown>;
    const events: unknown[] = Array.isArray(body)
      ? body
      : "events" in bodyRecord && Array.isArray(bodyRecord.events)
        ? (bodyRecord.events as unknown[])
        : [body];

    const client = await clientPromise;
    const coll = client.db(DB_NAME).collection(EVENTS_COLL);

    const accepted: TrackEventResponse[] = [];

    for (const raw of events) {
      const validation = validateEvent(raw as Record<string, unknown>);
      if (!validation.ok) {
        accepted.push({
          accepted: false,
          eventId: typeof (raw as Record<string, unknown>)?.eventId === "string"
            ? (raw as Record<string, unknown>).eventId as string
            : "unknown",
          reason: validation.reason,
        });
        continue;
      }

      const event = validation.event;

      const rateCheck = await checkRateLimit(event.userId);
      if (!rateCheck.allowed) {
        accepted.push({
          accepted: false,
          eventId: event.eventId,
          reason: `Rate limit exceeded. Retry after ${Math.ceil((rateCheck.retryAfterMs || 1000) / 1000)}s`,
        });
        continue;
      }

      const existing = await coll.findOne({ eventId: event.eventId });
      if (existing) {
        accepted.push({ accepted: true, eventId: event.eventId, deduplicated: true, reason: "Event already processed" });
        continue;
      }

      const { deviceHash: _omit, ...storable } = event;
      await coll.insertOne({ ...storable, receivedAt: new Date() });
      accepted.push({ accepted: true, eventId: event.eventId });
    }

    // Single-event request → mirror previous single-object response.
    if (events.length === 1) {
      const r = accepted[0];
      const status = r.accepted ? (r.deduplicated ? 200 : 200) : 400;
      return NextResponse.json(r, { status });
    }

    const allOk = accepted.every((r) => r.accepted);
    return NextResponse.json({ accepted }, { status: allOk ? 200 : 207 });
  } catch (error) {
    console.error("Track event ingestion error:", error);
    return NextResponse.json(
      { accepted: false, eventId: "unknown", reason: "Internal server error" } satisfies TrackEventResponse,
      { status: 500 },
    );
  }
}
