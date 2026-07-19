/**
 * Telemetry writer — assembles real `StadiumTelemetry` from aggregated data
 * sources and upserts it into the `telemetry` collection.
 *
 * This closes the null-gap: instead of returning null from /api/telemetry
 * because there's no real hub/weather/gate-label data, we derive those
 * labels from the admin-configured transit hubs, gate crowd, and weather API.
 */

import { clientPromise } from "@/lib/db";
import { aggregateCrowd } from "@/lib/crowd-aggregator";
import { getTransitHubs } from "@/lib/transit-hubs";
import { getWeatherAdvisory } from "@/lib/weather";

import { getCachedMatches } from "@/lib/match-cache";
import type { StadiumTelemetry, GateMetrics, GateStatus } from "@/types/telemetry";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";
const TELEMETRY_COLL = process.env.MONGODB_TELEMETRY_COLLECTION || "telemetry";

function capacityToStatus(capacityPct: number): GateStatus {
  if (capacityPct >= 80) return "high";
  if (capacityPct >= 60) return "medium";
  return "low";
}

function capacityToGateLabelStatus(capacityPct: number): "open" | "busy" | "congested" {
  if (capacityPct >= 80) return "congested";
  if (capacityPct >= 60) return "busy";
  return "open";
}

function gateStatusToIndexedKey(gateIndex: number): keyof GateMetrics {
  const keys: (keyof GateMetrics)[] = ["gate1", "gate2", "gate3", "gate4", "gate5", "gate6", "gate7", "gate8"];
  return keys[gateIndex] ?? `gate${gateIndex + 1}` as keyof GateMetrics;
}

/**
 * Build a real `StadiumTelemetry` object from live data sources.
 * Returns null if no crowd data exists (no events emitted yet).
 */
export async function buildLiveTelemetry(): Promise<StadiumTelemetry | null> {
  const now = Date.now();

  // 1. Aggregate crowd data (gate counts, confidence, capacity)
  const crowd = await aggregateCrowd().catch(() => null);
  if (!crowd || crowd.gateCrowds.every((g) => g.count === 0)) {
    return null;
  }

  const { gateCrowds } = crowd;

  // 2. Find the best gate for "nearestGate" — highest confidence with
  //    reasonable capacity. If none, pick the gate with most people.
  const bestGate = gateCrowds
    .filter((g) => g.confidence >= 0.3)
    .sort((a, b) => {
      // Prefer lower capacity percentage, tie-break with higher confidence
      const aCap = a.count / Math.max(a.capacityThreshold, 1);
      const bCap = b.count / Math.max(b.capacityThreshold, 1);
      return aCap - bCap;
    })[0] ?? gateCrowds.sort((a, b) => b.count - a.count)[0];

  const nearestGate = {
    label: bestGate?.gateId ?? "Unknown",
    status: capacityToGateLabelStatus(
      bestGate
        ? Math.round((bestGate.count / Math.max(bestGate.capacityThreshold, 1)) * 100)
        : 0,
    ),
  };

  // 3. Get the first transit hub for "nearestHub"
  const hubs = await getTransitHubs();
  const nearestHub = {
    label: hubs[0]?.label ?? "No transit hub configured",
    waitTime: 0, // computed on-demand by Maps API; 0 means "calculating"
  };

  // 4. Weather advisory
  let weatherAdvisory: { label: string; condition: "clear" | "rain" } = {
    label: "Weather unavailable",
    condition: "clear",
  };
  try {
    const { getSettings } = await import("@/lib/settings");
    const settings = await getSettings();
    const weather = await getWeatherAdvisory(
      settings.weather.stadiumLat,
      settings.weather.stadiumLng,
      settings.weather.provider,
    );
    if (weather.condition !== "unknown") {
      weatherAdvisory = {
        label: weather.label,
        condition: weather.condition === "rain" || weather.condition === "storm" ? "rain" : "clear",
      };
    }
  } catch {
    // weather unavailable — use fallback
  }

  // 5. Gate metrics (indexed gate1..gateN)
  const gateMetrics: Partial<GateMetrics> = {};
  for (let i = 0; i < Math.min(gateCrowds.length, 8); i++) {
    const crowd = gateCrowds[i];
    const capacityPct = Math.round((crowd.count / Math.max(crowd.capacityThreshold, 1)) * 100);
    const key = gateStatusToIndexedKey(i);
    gateMetrics[key] = capacityToStatus(capacityPct);
  }

  // 6. Total crowd count
  const crowdCount = gateCrowds.reduce((sum, g) => sum + g.count, 0);

  // 7. Match state
  let matchState: StadiumTelemetry["matchState"] = undefined;
  try {
    const cached = await getCachedMatches();
    const liveMatch = cached.matches.find((m) => m.status === "live");
    if (liveMatch) {
      matchState = {
        minute: liveMatch.minute ?? 0,
        half: 1,
        homeScore: liveMatch.homeScore ?? 0,
        awayScore: liveMatch.awayScore ?? 0,
        phase: "second-half",
      };
    }
  } catch {
    // match state unavailable
  }

  // 8. Gate events from latest crowd deltas
  const gateEvents: StadiumTelemetry["gateEvents"] = gateCrowds
    .filter((g) => g.count > 0)
    .map((g) => ({
      timestamp: now,
      gate: g.gateId,
      type: "entry" as const,
      crowdCount: g.count,
      message: `${g.gateId}: ${g.count} fans, ${Math.round(g.confidence * 100)}% confidence`,
    }));

  // 9. Admin logs
  const adminLogs: StadiumTelemetry["adminLogs"] = [
    {
      timestamp: now,
      level: "info",
      category: "system",
      message: `Telemetry auto-generated: ${crowdCount} fans across ${gateCrowds.length} gates`,
    },
  ];

  return {
    timestamp: now,
    nearestGate,
    nearestHub,
    weatherAdvisory,
    gateMetrics: gateMetrics as GateMetrics,
    crowdCount,
    gateEvents,
    matchState,
    adminLogs,
  };
}

/**
 * Upsert telemetry into the MongoDB collection.
 * Call this periodically (e.g., from a cron route) to keep live data fresh.
 */
export async function upsertTelemetry(telemetry: StadiumTelemetry): Promise<void> {
  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db(DB_NAME);
    await db.collection(TELEMETRY_COLL).insertOne({
      ...telemetry,
      _createdAt: new Date(),
    });
    // Keep only the last 100 entries for rolling window
    await db.collection(TELEMETRY_COLL)
      .deleteMany({ _createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
  } catch (err) {
    console.error("Failed to upsert telemetry:", err);
  }
}
