/**
 * Transit-hub registry — admin-configurable list of transit hubs near
 * the stadium.
 *
 * Loaded from `settings.transitHubs`. Used by:
 *  - Egress planner to resolve gate → real hub lat/lng (instead of
 *    synthetic "Gate G1 transit hub" strings)
 *  - Telemetry writer to populate `nearestHub`
 *  - Orchestrator tools `getTransitHubWaitTimes` and `getMapsDistanceMatrix`
 */

import type { LatLng } from "@/lib/maps-agent";

export interface TransitHub {
  id: string;
  label: string;
  lat: number;
  lng: number;
  travelMode: "WALK" | "TRANSIT" | "DRIVE";
  gateId?: string;
}

/** Return all hubs from the admin settings. */
export async function getTransitHubs(): Promise<TransitHub[]> {
  try {
    const { getSettings } = await import("@/lib/settings");
    const settings = await getSettings();
    return settings.transitHubs ?? [];
  } catch {
    return [];
  }
}

/** Find the hub linked to a specific gate. */
export async function hubForGate(gateId: string): Promise<TransitHub | undefined> {
  const hubs = await getTransitHubs();
  return hubs.find((h) => h.gateId === gateId);
}

/** Find a hub by its id. */
export async function getHub(id: string): Promise<TransitHub | undefined> {
  const hubs = await getTransitHubs();
  return hubs.find((h) => h.id === id);
}

/** Get all hub coordinates (for batch route matrix calls). */
export async function allHubLatLngs(): Promise<LatLng[]> {
  const hubs = await getTransitHubs();
  return hubs.map((h) => ({ latitude: h.lat, longitude: h.lng }));
}

/** Get hub coordinates keyed by hub id. */
export async function hubMap(): Promise<Record<string, LatLng>> {
  const hubs = await getTransitHubs();
  const m: Record<string, LatLng> = {};
  for (const h of hubs) {
    m[h.id] = { latitude: h.lat, longitude: h.lng };
  }
  return m;
}
