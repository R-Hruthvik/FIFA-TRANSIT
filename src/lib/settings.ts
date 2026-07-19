/**
 * Centralized settings loader.
 *
 * Merges the DB `settings` doc (non-secret admin config) with env-var fallbacks
 * for every integration. The API that feeds this loader enforces that NO secret
 * value ever enters or leaves the MongoDB `settings` collection — secrets are
 * Vercel env vars only.
 *
 * Every secret-adjacent field returns `{ apiKeySet: boolean }` instead of
 * the raw key, so the UI can show a Configured / Not Configured indicator
 * without ever touching a credential.
 */

import { clientPromise, GLOBAL_SETTINGS_ID } from "@/lib/db";
import { GATES, BEACONS, GATE_IDS, type GateConfig, type BeaconConfig } from "@/lib/venue-config";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";

// ── Types ───────────────────────────────────────────────────────────────

export interface FeatureFlagSettings {
  enableRealMatchData: boolean;
  enableOneTap: boolean;
  enableHeatmapAnimation: boolean;
}

export interface MatchApiSettings {
  provider: "football-data" | "api-football";
  cacheTTL: number;
}

export interface AiProviderSettings {
  provider: "gemini" | "openai-compat" | "vertex";
  model: string;
  baseUrl?: string | null;
  vertexProjectId?: string;
  vertexLocation?: string;
}

export interface MapsSettings {
  defaultTravelMode: "DRIVE" | "TRANSIT" | "WALK";
}

export interface EmailSettings {
  fromAddress: string;
  provider: "resend";
}

export interface RateLimitSettings {
  nimBudgetPerMin: number;
}

export interface WeatherSettings {
  provider: "open-meteo" | "openweather";
  stadiumLat: number;
  stadiumLng: number;
}

export interface TransitHubEntry {
  id: string;
  label: string;
  lat: number;
  lng: number;
  travelMode: "WALK" | "TRANSIT" | "DRIVE";
  gateId?: string;
}

export interface VenueThresholds {
  lookbackWindowMs: number;
  exitGraceMs: number;
  confidenceThreshold: number;
  walkSpeedMPerMin: number;
  stadiumRadiusM: number;
}

export interface VenueSettings {
  gates: GateConfig[];
  beacons: BeaconConfig[];
  thresholds: VenueThresholds;
}

export type GateOverrides = Record<string, string>;

/** Secret status: env-based, never a raw key. */
export interface SecretStatus {
  apiKeySet: boolean;
}

export interface AppSettings {
  featureFlags: FeatureFlagSettings;
  matchApi: MatchApiSettings & { secret: SecretStatus };
  aiProvider: AiProviderSettings & { secret: SecretStatus };
  maps: MapsSettings & { secret: SecretStatus };
  email: EmailSettings & { secret: SecretStatus };
  rateLimit: RateLimitSettings;
  weather: WeatherSettings;
  transitHubs: TransitHubEntry[];
  venue: VenueSettings;
  gateOverrides: GateOverrides;
}

// ── DB doc shape (what actually lives in MongoDB — no secrets) ──────────

interface RawSettingsDoc {
  featureFlags?: Partial<FeatureFlagSettings>;
  matchApi?: Partial<MatchApiSettings>;
  aiProvider?: Partial<AiProviderSettings>;
  maps?: Partial<MapsSettings>;
  email?: Partial<EmailSettings>;
  rateLimit?: Partial<RateLimitSettings>;
  weather?: Partial<WeatherSettings>;
  transitHubs?: TransitHubEntry[];
  venue?: Partial<VenueSettings>;
  gateOverrides?: GateOverrides;
}

// ── Defaults ────────────────────────────────────────────────────────────

const DEFAULT_FEATURE_FLAGS: FeatureFlagSettings = {
  enableRealMatchData: false,
  enableOneTap: false,
  enableHeatmapAnimation: true,
};

const DEFAULT_MATCH_API: MatchApiSettings = {
  provider: "football-data",
  cacheTTL: 300,
};

const DEFAULT_AI_PROVIDER: AiProviderSettings = {
  provider: "openai-compat",
  model: "meta/llama-3.1-70b-instruct",
};

const DEFAULT_MAPS: MapsSettings = {
  defaultTravelMode: "WALK",
};

const DEFAULT_EMAIL: EmailSettings = {
  fromAddress: "FIFA Operations <noreply@stadium-ops.fifa.com>",
  provider: "resend",
};

const DEFAULT_RATE_LIMIT: RateLimitSettings = {
  nimBudgetPerMin: 20,
};

const DEFAULT_WEATHER: WeatherSettings = {
  provider: "open-meteo",
  stadiumLat: 25.0,
  stadiumLng: -80.1,
};

const DEFAULT_VENUE_THRESHOLDS: VenueThresholds = {
  lookbackWindowMs: 5 * 60_000,
  exitGraceMs: 90_000,
  confidenceThreshold: 0.35,
  walkSpeedMPerMin: 80,
  stadiumRadiusM: 250,
};

// ── Secret status helpers ───────────────────────────────────────────────

function matchKeyConfigured(): boolean {
  const provider = (process.env.MATCH_API_PROVIDER || "football-data") as string;
  if (provider === "football-data" && process.env.FOOTBALL_DATA_API_KEY) return true;
  if (provider === "api-football" && process.env.API_FOOTBALL_KEY) return true;
  if (process.env.MATCH_API_KEY) return true;
  return false;
}

function aiKeyConfigured(): boolean {
  if (process.env.NVIDIA_NIM_API_KEY) return true;
  if (process.env.GEMINI_API_KEY) return true;
  if (process.env.VERTEX_PROJECT_ID && process.env.VERTEX_API_KEY) return true;
  return false;
}

function mapsKeyConfigured(): boolean {
  return !!process.env.GOOGLE_MAPS_API_KEY;
}

function emailKeyConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// ── Loader ──────────────────────────────────────────────────────────────

export async function getSettings(): Promise<AppSettings> {
  const raw = await loadRawSettings();

  const featureFlags: FeatureFlagSettings = {
    ...DEFAULT_FEATURE_FLAGS,
    ...raw.featureFlags,
  };

  const matchApi: MatchApiSettings & { secret: SecretStatus } = {
    ...DEFAULT_MATCH_API,
    ...raw.matchApi,
    secret: { apiKeySet: matchKeyConfigured() },
  };

  const aiProvider: AiProviderSettings & { secret: SecretStatus } = {
    ...DEFAULT_AI_PROVIDER,
    ...raw.aiProvider,
    secret: { apiKeySet: aiKeyConfigured() },
  };

  const maps: MapsSettings & { secret: SecretStatus } = {
    ...DEFAULT_MAPS,
    ...raw.maps,
    secret: { apiKeySet: mapsKeyConfigured() },
  };

  const email: EmailSettings & { secret: SecretStatus } = {
    ...DEFAULT_EMAIL,
    ...raw.email,
    secret: { apiKeySet: emailKeyConfigured() },
  };

  const rateLimit: RateLimitSettings = {
    ...DEFAULT_RATE_LIMIT,
    ...raw.rateLimit,
  };

  const weather: WeatherSettings = {
    ...DEFAULT_WEATHER,
    ...raw.weather,
  };

  const rawThresholds = raw.venue?.thresholds ?? {};
  const thresholds: VenueThresholds = {
    ...DEFAULT_VENUE_THRESHOLDS,
    ...rawThresholds,
  };

  const settings: AppSettings = {
    featureFlags,
    matchApi,
    aiProvider,
    maps,
    email,
    rateLimit,
    weather,
    transitHubs: raw.transitHubs ?? [],
    venue: {
      gates: raw.venue?.gates ?? GATES,
      beacons: raw.venue?.beacons ?? BEACONS,
      thresholds,
    },
    gateOverrides: raw.gateOverrides ?? {},
  };

  return settings;
}

/** Thin typed wrapper over `venue-config.ts` constants */
export function getDefaultGates() {
  return GATES;
}

export function getDefaultBeacons() {
  return BEACONS;
}

export function getDefaultGateIds() {
  return GATE_IDS;
}

// ── Internal ────────────────────────────────────────────────────────────

async function loadRawSettings(): Promise<RawSettingsDoc> {
  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db(DB_NAME);
    const doc = await db.collection("settings").findOne(
      { _id: GLOBAL_SETTINGS_ID },
    ) as Record<string, unknown> | null;
    if (!doc) return {};
    delete doc._id;
    return doc as RawSettingsDoc;
  } catch {
    return {};
  }
}
