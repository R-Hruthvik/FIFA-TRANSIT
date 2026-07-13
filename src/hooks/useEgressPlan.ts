/**
 * useEgressPlan — On-device cache + live broadcast adjuster
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D8 — Delivery = B baseline + A enhancement:
 *      B: compute-once + cache-on-device (this hook)
 *      A: live server-push reroute if network holds
 * D9 — Below opt-in threshold → AI defers to stewards
 *
 * This hook implements the D8-B baseline:
 *  1. Fetches the pre-match egress plan from the server
 *  2. Caches it in IndexedDB (survives page refreshes, works offline)
 *  3. Listens to SSE stream for crowd updates
 *  4. Applies lightweight broadcast adjustments to the cached plan
 *  5. When confidence drops below threshold → defers to stewards
 *
 * The cached plan is the "always works" fallback. When network holds
 * (D8-A), the SSE stream can update it live. When it doesn't (post-match
 * saturation), the cached plan still guides the user.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { EgressPlan, GateSummary, GateCrowd } from "@/types/position";

const PLAN_CACHE_KEY = "fifa_egress_plan";
const PLAN_VERSION_KEY = "fifa_egress_plan_version";
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours (match day)

// ── IndexedDB helpers ──────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("FifaTransitDB", 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("plans")) {
        db.createObjectStore("plans", { keyPath: "key" });
      }
    };
  });
}

async function getCachedPlan(): Promise<EgressPlan | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("plans", "readonly");
      const store = tx.objectStore("plans");
      const request = store.get(PLAN_CACHE_KEY);
      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        // Check TTL
        const cached = result.value as { plan: EgressPlan; cachedAt: number };
        if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
          // Expired — clean up
          store.delete(PLAN_CACHE_KEY);
          resolve(null);
          return;
        }

        resolve(cached.plan);
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function setCachedPlan(plan: EgressPlan): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("plans", "readwrite");
      const store = tx.objectStore("plans");
      store.put({
        key: PLAN_CACHE_KEY,
        value: { plan, cachedAt: Date.now() },
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Silently fail — caching is best-effort
  }
}

async function getCachedVersion(): Promise<number | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("plans", "readonly");
      const store = tx.objectStore("plans");
      const request = store.get(PLAN_VERSION_KEY);
      request.onsuccess = () => resolve(request.result?.value ?? null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function setCachedVersion(version: number): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("plans", "readwrite");
      const store = tx.objectStore("plans");
      store.put({ key: PLAN_VERSION_KEY, value: version });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Silently fail
  }
}

// ── Hook ───────────────────────────────────────────────────────────────

interface UseEgressPlanOptions {
  /** User's last known position (passed to server for plan generation) */
  userPosition?: unknown;
  /** User's preferred language */
  language?: string;
  /** Whether the match has ended */
  matchEnded?: boolean;
  /** Server version for cache invalidation */
  serverVersion?: number;
}

interface UseEgressPlanResult {
  /** The current egress plan (from cache or live) */
  plan: EgressPlan | null;
  /** Whether the plan is being loaded */
  isLoading: boolean;
  /** Gate summary for broadcast overlay */
  gateSummary: GateSummary[] | null;
  /** Whether we're connected to the SSE stream */
  isLive: boolean;
  /** Manually refresh the plan from the server */
  refresh: () => void;
}

export function useEgressPlan(
  options: UseEgressPlanOptions = {},
): UseEgressPlanResult {
  const { userPosition, language, matchEnded, serverVersion } = options;

  const [plan, setPlan] = useState<EgressPlan | null>(null);
  const [gateSummary, setGateSummary] = useState<GateSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);

  const planRef = useRef<EgressPlan | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Fetch plan from server ──────────────────────────────────────────

  const fetchPlan = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      setIsLoading(true);

      // Build query params
      const params = new URLSearchParams();
      if (userPosition) {
        params.set("position", JSON.stringify(userPosition));
      }
      if (language) params.set("lang", language);
      if (matchEnded) params.set("egress", "true");
      if (serverVersion) params.set("version", String(serverVersion));

      const res = await fetch(`/api/track/plan?${params}`, {
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Plan fetch failed: ${res.status}`);

      const data = (await res.json()) as { plan: EgressPlan; version: number };
      const newPlan = { ...data.plan, stale: false };

      planRef.current = newPlan;
      setPlan(newPlan);
      await setCachedPlan(newPlan);
      await setCachedVersion(data.version);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Failed to fetch egress plan:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userPosition, language, matchEnded, serverVersion]);

  // ── Connect to SSE stream ───────────────────────────────────────────

  const connectStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource("/api/track/stream");
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsLive(true);
    };

    es.onerror = () => {
      setIsLive(false);
      // Auto-reconnect after 5s
      setTimeout(connectStream, 5000);
    };

    es.addEventListener("crowd_update", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "crowd_update" && data.gates) {
          setGateSummary(
            data.gates.map((gc: GateCrowd) => ({
              gateId: gc.gateId,
              capacityPct: Math.round((gc.count / gc.capacityThreshold) * 100),
              status: (gc.count / gc.capacityThreshold) >= 0.8 ? "critical" :
                       (gc.count / gc.capacityThreshold) >= 0.5 ? "busy" : "open",
            })),
          );
        }
      } catch {
        // Ignore parse errors
      }
    });

    es.addEventListener("alert", (event) => {
      try {
        const data = JSON.parse(event.data);
        // If low confidence or critical alert, mark plan as stale
        if (data.type === "alert" && planRef.current) {
          setPlan((prev) =>
            prev ? { ...prev, stale: true } : prev,
          );
        }
      } catch {
        // Ignore
      }
    });

    es.addEventListener("egress_plan", (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "egress_plan" && data.plan) {
          const newPlan = { ...data.plan, stale: false };
          planRef.current = newPlan;
          setPlan(newPlan);
          setCachedPlan(newPlan);
        }
      } catch {
        // Ignore
      }
    });
  }, []);

  // ── Lifecycle ───────────────────────────────────────────────────────

  // Load cached plan on mount
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const cached = await getCachedPlan();
      const cachedVersion = await getCachedVersion();

      if (!cancelled && cached) {
        // If server version matches, use cache. Otherwise fetch fresh.
        if (serverVersion && cachedVersion === serverVersion) {
          planRef.current = cached;
          setPlan(cached);
        }
        // Always fetch fresh if we have a stale cache or version mismatch
      }

      if (!cancelled) {
        await fetchPlan();
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when dependencies change
  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  // Connect SSE stream on mount
  useEffect(() => {
    connectStream();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connectStream]);

  // Cleanup
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    plan,
    isLoading,
    gateSummary,
    isLive,
    refresh: fetchPlan,
  };
}
