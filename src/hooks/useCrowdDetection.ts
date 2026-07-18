/**
 * useCrowdDetection — mounts the phone-side CrowdDetector with consent gating.
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D1 — opt-in only, D3 — events not GPS, D8 — on-device baseline.
 *
 * Responsibilities:
 *  - Resolve a pseudonymous id (consent.ts)
 *  - Only run the detector after consent is granted
 *  - Expose live status + the gate the user is currently nearest/inside
 *  - Auto-start/stop with the component lifecycle
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CrowdDetector, type DetectorStatus } from "@/lib/tracking/CrowdDetector";
import {
  getPseudonymousId,
  hasLocalConsent,
  setConsent,
} from "@/lib/tracking/consent";
import { GATES } from "@/lib/venue-config";

export interface UseCrowdDetectionOptions {
  /** Stadium center lat/lng so geolocation maps to stadium-relative meters. */
  origin?: { lat: number; lng: number };
}

export interface UseCrowdDetectionResult {
  consented: boolean;
  status: DetectorStatus;
  currentGate: string | null;
  nearbyDistanceM: number | null;
  /** Pseudonymous id (for nearby lookups). */
  userId: string | null;
  /** How many other opted-in users are co-located with you. */
  nearbyCount: number | null;
  toggleConsent: () => Promise<void>;
}

const METERS_PER_DEG_LAT = 111_320;
const NEARBY_POLL_MS = 10_000;

export function useCrowdDetection(opts: UseCrowdDetectionOptions = {}): UseCrowdDetectionResult {
  const { origin } = opts;
  const [consented, setConsented] = useState(() => hasLocalConsent());
  const [status, setStatus] = useState<DetectorStatus>("idle");
  const [currentGate, setCurrentGate] = useState<string | null>(null);
  const [nearbyDistanceM, setNearbyDistanceM] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [nearbyCount, setNearbyCount] = useState<number | null>(null);
  const detectorRef = useRef<CrowdDetector | null>(null);
  const watchRef = useRef<number | null>(null);

  const stopDetector = useCallback(() => {
    detectorRef.current?.stop();
    detectorRef.current = null;
    if (watchRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
      watchRef.current = null;
    }
    setStatus("idle");
    setCurrentGate(null);
    setNearbyDistanceM(null);
    setNearbyCount(null);
  }, []);

  const startDetector = useCallback(async () => {
    const uid = await getPseudonymousId();
    setUserId(uid);

    const detector = new CrowdDetector({ userId: uid, onStatus: (s) => setStatus(s) });
    if (origin) detector.setOrigin(origin.lat, origin.lng);
    detectorRef.current = detector;
    await detector.start();

    // Nearest-gate indicator (independent of emit logic; for UI only).
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat0 = origin?.lat ?? 0;
          const lng0 = origin?.lng ?? 0;
          const mPerDegLng = METERS_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
          const rx = (pos.coords.longitude - lng0) * mPerDegLng;
          const ry = (pos.coords.latitude - lat0) * METERS_PER_DEG_LAT;

          let nearest: string | null = null;
          let best = Infinity;
          for (const g of GATES) {
            const d = Math.hypot(rx - g.x, ry - g.y);
            if (d < best) {
              best = d;
              nearest = g.id;
            }
          }
          setCurrentGate(nearest);
          setNearbyDistanceM(Number.isFinite(best) ? Math.round(best) : null);
        },
        () => {},
        { enableHighAccuracy: false, maximumAge: 10_000 },
      );
    }
  }, [origin]);

  const toggleConsent = useCallback(async () => {
    const next = !consented;
    await setConsent(next);
    setConsented(next);
    if (next) {
      await startDetector();
    } else {
      stopDetector();
    }
  }, [consented, startDetector, stopDetector]);

  // Poll the server for co-located nearby-user count.
  useEffect(() => {
    if (!consented || !userId) return;
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/track/nearby?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { nearbyCount?: number };
        if (active) setNearbyCount(data.nearbyCount ?? 0);
      } catch {
        // Ignore transient errors.
      }
    };
    void poll();
    const t = setInterval(poll, NEARBY_POLL_MS);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [consented, userId]);

  // Mount-only: start detector if consent was already granted; always
  // stop on unmount. Uses a ref so it does not re-run on every render.
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      if (consented) void startDetector(); // eslint-disable-line react-hooks/set-state-in-effect
    }
    return () => stopDetector();
  }, [consented, startDetector, stopDetector]);

  return { consented, status, currentGate, nearbyDistanceM, userId, nearbyCount, toggleConsent };
}
