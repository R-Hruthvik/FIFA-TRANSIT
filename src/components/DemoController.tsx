"use client";

import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { getDemoSnapshot, getDemoAiResponse, DEMO_DURATION_MS } from "@/lib/demo-data";
import { GateMetrics, StadiumTelemetry } from "@/types/telemetry";

interface DemoContextValue {
  isDemoMode: boolean;
  toggleDemo: () => void;
  demoElapsed: number;
  getMetrics: () => GateMetrics;
  getTelemetry: () => StadiumTelemetry;
  getDemoAiResponse: (input: string) => string;
  injectDemoQuery: () => string | null;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemoMode() {
  return useContext(DemoContext);
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoElapsed, setDemoElapsed] = useState(0);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const queryIndexRef = useRef(0);

  const toggleDemo = useCallback(() => {
    setIsDemoMode((prev) => {
      if (!prev) {
        // Starting demo — reset refs synchronously
        startTimeRef.current = Date.now();
        queryIndexRef.current = 0;
      } else {
        // Stopping demo
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return !prev;
    });
    // Reset elapsed AFTER isDemoMode flips to true, so the interval
    // effect picks up demoElapsed=0 on its first tick
    if (!isDemoMode) {
      setDemoElapsed(0);
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (!isDemoMode) return;

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed >= DEMO_DURATION_MS) {
        // Demo complete — auto-disable
        setIsDemoMode(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        return;
      }
      setDemoElapsed(elapsed);
    }, 500);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isDemoMode]);

  const getMetrics = useCallback((): GateMetrics => {
    if (!isDemoMode) return { gateA: "low", gateB: "low", gateC: "low", gateD: "low" };
    return getDemoSnapshot(demoElapsed).metrics;
  }, [isDemoMode, demoElapsed]);

  const getTelemetry = useCallback((): StadiumTelemetry => {
    if (!isDemoMode) {
      return {
        nearestGate: { label: "SCANNING...", status: "open" },
        nearestHub: { label: "SCANNING...", waitTime: 0 },
        weatherAdvisory: { label: "SCANNING...", condition: "clear" },
      };
    }
    return getDemoSnapshot(demoElapsed).telemetry;
  }, [isDemoMode, demoElapsed]);

  const getDemoAiResponseFn = useCallback((input: string): string => {
    const snapshot = getDemoSnapshot(demoElapsed);
    return getDemoAiResponse(input, snapshot);
  }, [demoElapsed]);

  const injectDemoQuery = useCallback((): string | null => {
    if (!isDemoMode) return null;
    const snapshot = getDemoSnapshot(demoElapsed);
    const queries = snapshot.queries;
    if (queries.length === 0) return null;
    const query = queries[queryIndexRef.current % queries.length];
    queryIndexRef.current++;
    return query;
  }, [isDemoMode, demoElapsed]);

  return (
    <DemoContext.Provider value={{
      isDemoMode,
      toggleDemo,
      demoElapsed,
      getMetrics,
      getTelemetry,
      getDemoAiResponse: getDemoAiResponseFn,
      injectDemoQuery,
    }}>
      {children}
    </DemoContext.Provider>
  );
}

// Demo Mode Toggle Button
export function DemoModeButton() {
  const demo = useDemoMode();
  if (!demo) return null;

  const progress = demo.demoElapsed / DEMO_DURATION_MS;

  return (
    <button
      onClick={demo.toggleDemo}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-[0.15em] uppercase transition-all ${
        demo.isDemoMode
          ? "bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30"
          : "bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/50 text-zinc-400 hover:text-amber-400"
      }`}
    >
      {demo.isDemoMode && (
        <div
          className="absolute inset-0 rounded-xl bg-amber-500/10"
          style={{ width: `${progress * 100}%`, transition: "width 0.5s linear" }}
        />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {demo.isDemoMode ? (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            DEMO LIVE
          </>
        ) : (
          <>
            ▶ START DEMO
          </>
        )}
      </span>
    </button>
  );
}
