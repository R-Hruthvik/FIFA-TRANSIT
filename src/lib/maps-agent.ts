/**
 * City-Transit Grounding Integration.
 *
 * Grounds LLM egress path briefings in real transit data by calling the
 * Google Maps Routes API (`/directions/v2:computeRoutes`) for live traffic-aware
 * durations, then fusing that with the system's own gate-congestion variables
 * so the model produces an optimized, reality-grounded path briefing.
 *
 * Primary LLM: Gemini. Deterministic fallback when no key / API failure.
 */

import type { GateSummary } from "@/types/position";

export const ROUTES_ENDPOINT =
  "https://routes.googleapis.com/directions/v2:computeRoutes";

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface TransitLeg {
  /** Human label for the route/leg destination (transit hub / station). */
  label: string;
  /** Live traffic-aware duration in minutes. */
  durationMinutes: number;
  /** Distance in meters. */
  distanceMeters: number;
  /** Whether this came from the live Routes API vs. a fallback estimate. */
  live: boolean;
}

export interface RouteBriefingInput {
  origin: LatLng;
  destination: LatLng;
  /** Human label for the destination transit hub. */
  destinationLabel: string;
  /** Live gate congestion summaries from crowd-aggregator. */
  gateSummaries: GateSummary[];
  /** Optional preferred travel mode; defaults to transit. */
  travelMode?: "TRANSIT" | "DRIVE" | "WALK";
}

export interface RouteBriefing {
  briefing: string;
  transit: TransitLeg;
  generatedAt: number;
}

/**
 * Pull the active traffic-aware transit duration from the Google Maps
 * Routes API. Returns a deterministic fallback leg if the key is missing
 * or the request fails, so callers never need to branch on availability.
 */
export async function computeTransitLeg(
  origin: LatLng,
  destination: LatLng,
  destinationLabel: string,
  travelMode: RouteBriefingInput["travelMode"] = "TRANSIT",
): Promise<TransitLeg> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const fallback: TransitLeg = {
    label: destinationLabel,
    durationMinutes: 0,
    distanceMeters: 0,
    live: false,
  };

  if (!key) return fallback;

  try {
    const res = await fetch(ROUTES_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: { location: { latLng: origin } },
        destination: { location: { latLng: destination } },
        travelMode,
        // Traffic-aware routing is only valid for DRIVE; ignored otherwise.
        ...(travelMode === "DRIVE"
          ? { routingPreference: "TRAFFIC_AWARE" }
          : {}),
      }),
    });

    if (!res.ok) return fallback;

    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return fallback;

    // Routes API returns duration as a protobuf duration string, e.g. "930s".
    const durationSeconds = Number(
      String(route.duration ?? "0s").replace(/s$/, ""),
    );

    return {
      label: destinationLabel,
      durationMinutes: Math.round(durationSeconds / 60),
      distanceMeters: Number(route.distanceMeters ?? 0),
      live: true,
    };
  } catch (err) {
    console.error("computeTransitLeg error:", err);
    return fallback;
  }
}

function buildBriefingPrompt(input: RouteBriefingInput, leg: TransitLeg): string {
  const gateLines = input.gateSummaries.length
    ? input.gateSummaries
        .map(
          (g) =>
            `- ${g.gateId}: ${g.status} (${g.capacityPct}% capacity)` +
            (g.recommended ? " [recommended]" : "") +
            (g.avoid ? " [avoid]" : ""),
        )
        .join("\n")
    : "- Gate congestion: not available";

  return [
    "You are a transit routing agent for the FIFA World Cup 2026.",
    "Produce a SHORT (<= 3 sentences) optimized path briefing for a fan leaving the stadium.",
    "Ground your advice in the live transit duration and the gate congestion below.",
    "",
    "Live transit leg:",
    `- Destination hub: ${leg.label}`,
    `- Duration: ${leg.durationMinutes} min ${leg.live ? "(live traffic)" : "(estimate unavailable)"}`,
    `- Distance: ${leg.distanceMeters} m`,
    "",
    "Live gate congestion:",
    gateLines,
    "",
    "Rules: recommend the least-congested gate, mention the transit duration,",
    "avoid gates flagged [avoid]. No markdown, no preamble — output only the briefing.",
  ].join("\n");
}

async function generateWithGemini(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 160, temperature: 0.3 },
        }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

function fallbackBriefing(input: RouteBriefingInput, leg: TransitLeg): string {
  const best =
    input.gateSummaries.find((g) => g.recommended) ??
    [...input.gateSummaries].sort((a, b) => a.capacityPct - b.capacityPct)[0];
  const gatePart = best
    ? `Exit via ${best.gateId} (${best.status}).`
    : "Follow steward direction to the nearest open gate.";
  const transitPart = leg.live
    ? ` Transit to ${leg.label} is ~${leg.durationMinutes} min.`
    : ` Live transit time to ${leg.label} is currently unavailable.`;
  return `${gatePart}${transitPart}`;
}

/**
 * End-to-end: pull the live transit leg, ground the LLM in it plus gate
 * congestion, and return an optimized path briefing.
 */
export async function generateRouteBriefing(
  input: RouteBriefingInput,
): Promise<RouteBriefing> {
  const leg = await computeTransitLeg(
    input.origin,
    input.destination,
    input.destinationLabel,
    input.travelMode,
  );

  const prompt = buildBriefingPrompt(input, leg);
  const briefing =
    (await generateWithGemini(prompt)) ?? fallbackBriefing(input, leg);

  return { briefing, transit: leg, generatedAt: Date.now() };
}

// ── Agentic transit route (fan-facing conversational guidance) ──────────

/** Parse a "lat,lng" string into a LatLng, or null if malformed. */
function parseLatLng(coords: string): LatLng | null {
  const parts = String(coords || "")
    .split(",")
    .map((p) => Number(p.trim()));
  if (parts.length !== 2 || parts.some((n) => Number.isNaN(n))) return null;
  return { latitude: parts[0], longitude: parts[1] };
}

/** Compiled real-world traffic telemetry from the Routes API. */
interface RouteTelemetry {
  durationMinutes: number;
  distanceMeters: number;
  live: boolean;
}

async function fetchRouteTelemetry(
  origin: LatLng,
  targetTransitHub: string,
): Promise<RouteTelemetry> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const fallback: RouteTelemetry = {
    durationMinutes: 0,
    distanceMeters: 0,
    live: false,
  };
  if (!key) return fallback;

  try {
    const res = await fetch(ROUTES_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: { location: { latLng: origin } },
        destination: { address: targetTransitHub },
        // Walk/transit egress with traffic-aware preference.
        travelMode: "WALK",
        routingPreference: "TRAFFIC_AWARE",
      }),
    });

    if (!res.ok) return fallback;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return fallback;

    const durationSeconds = Number(
      String(route.duration ?? "0s").replace(/s$/, ""),
    );
    return {
      durationMinutes: Math.round(durationSeconds / 60),
      distanceMeters: Number(route.distanceMeters ?? 0),
      live: true,
    };
  } catch (err) {
    console.error("fetchRouteTelemetry error:", err);
    return fallback;
  }
}

function buildAgenticPrompt(
  telemetry: RouteTelemetry,
  targetTransitHub: string,
  stadiumGateCongestion: unknown,
): string {
  return [
    "You are a fan egress routing agent for the FIFA World Cup 2026.",
    "Using the real-world transit data and the internal stadium gate congestion,",
    "write a SHORT conversational guidance block of EXACTLY 2 sentences.",
    "Advise the fan whether to take their standard exit path or divert to a",
    "less crowded egress sector based on the outside traffic conditions.",
    "No markdown, no preamble — output only the 2 sentences.",
    "",
    `Real-world route to ${targetTransitHub}:`,
    `- Duration: ${telemetry.durationMinutes} min ${telemetry.live ? "(live traffic-aware)" : "(estimate unavailable)"}`,
    `- Distance: ${telemetry.distanceMeters} m`,
    "",
    "Internal stadium gate congestion:",
    JSON.stringify(stadiumGateCongestion),
  ].join("\n");
}

/**
 * Compute an intelligent, traffic-aware fan egress guidance block.
 *
 * Queries the Google Maps Routes API for the walk/transit route from the
 * fan's coordinates to the target transit hub, compiles the traffic
 * telemetry, then passes it to gemini-2.5-flash alongside the internal
 * gate congestion to draft a 2-sentence conversational recommendation.
 *
 * Returns a deterministic fallback string when Maps/Gemini are unavailable.
 */
export async function computeAgenticTransitRoute(
  fanOriginCoordinates: string,
  targetTransitHub: string,
  stadiumGateCongestion: unknown,
): Promise<string | null> {
  // Live-data guard: only engage the external Routes API + AI when the caller
  // supplied genuine GPS coordinates ("lat,lng"). Stadium-relative {x,y} meters
  // or empty payloads bail out to the standard local enhancement path.
  const isValidLatLng = /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(
    String(fanOriginCoordinates),
  );
  if (!isValidLatLng) {
    return null;
  }

  const origin = parseLatLng(fanOriginCoordinates);

  const telemetry = origin
    ? await fetchRouteTelemetry(origin, targetTransitHub)
    : { durationMinutes: 0, distanceMeters: 0, live: false };

  const key = process.env.GEMINI_API_KEY;
  if (key) {
    const prompt = buildAgenticPrompt(
      telemetry,
      targetTransitHub,
      stadiumGateCongestion,
    );
    const generated = await generateWithGemini(prompt);
    if (generated) return generated;
  }

  // Deterministic fallback guidance.
  const transitPart = telemetry.live
    ? `Transit to ${targetTransitHub} is about ${telemetry.durationMinutes} min in current traffic.`
    : `Live transit time to ${targetTransitHub} is unavailable right now.`;
  return `${transitPart} Follow your standard exit path unless a steward directs you to a less crowded egress sector.`;
}
