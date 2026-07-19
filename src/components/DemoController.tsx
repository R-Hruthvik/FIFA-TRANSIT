"use client";

import { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from "react";
import { GateMetrics, StadiumTelemetry } from "@/types/telemetry";
import {
  LiveDemoEngine,
  CrowdPosition,
  GateEvent,
  AdminLogEntry,
  MatchSimulationState,
} from "@/lib/live-demo-engine";

interface DemoContextValue {
  isDemoMode: boolean;
  toggleDemo: () => void;
  demoElapsed: number;
  getMetrics: () => GateMetrics | null;
  getTelemetry: () => StadiumTelemetry | null;
  getDemoAiResponse: (input: string) => string;
  injectDemoQuery: () => string | null;

  // Live simulation accessors
  getCrowdPositions: () => CrowdPosition[];
  getCrowdCount: () => number;
  getGateEvents: () => GateEvent[];
  getRecentGateEvents: (minutesAge: number) => GateEvent[];
  getAdminLogs: () => AdminLogEntry[];
  getRecentAdminLogs: (count: number) => AdminLogEntry[];
  getMatchState: () => MatchSimulationState | null;
  setRealUserCount: (count: number) => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemoMode() {
  return useContext(DemoContext);
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [demoElapsed, setDemoElapsed] = useState(0);
  const engineRef = useRef<LiveDemoEngine | null>(null);

  const toggleDemo = useCallback(() => {
    setIsDemoMode((prev) => {
      if (!prev) {
        const engine = new LiveDemoEngine();
        engine.start();
        engineRef.current = engine;
      } else {
        if (engineRef.current) {
          engineRef.current.stop();
          engineRef.current = null;
        }
      }
      return !prev;
    });
    if (!isDemoMode) {
      setDemoElapsed(0);
    }
  }, [isDemoMode]);

  useEffect(() => {
    const w = window as unknown as {
      __liveDemoEngine?: LiveDemoEngine | null;
    };
    w.__liveDemoEngine = engineRef.current;
    return () => {
      w.__liveDemoEngine = null;
    };
  }, [isDemoMode]);

  useEffect(() => {
    if (!isDemoMode || !engineRef.current) return;

    const updateInterval = setInterval(() => {
      if (!engineRef.current) return;
      setDemoElapsed(engineRef.current.getElapsed());
    }, 200);

    return () => clearInterval(updateInterval);
  }, [isDemoMode]);

  const getMetrics = useCallback((): GateMetrics | null => {
    if (!isDemoMode || !engineRef.current) return null;
    return engineRef.current.getMetrics();
  }, [isDemoMode]);

  const getTelemetry = useCallback((): StadiumTelemetry | null => {
    if (!isDemoMode || !engineRef.current) return null;
    return engineRef.current.getTelemetry();
  }, [isDemoMode]);

  const getDemoAiResponseFn = useCallback((input: string): string => {
    if (!isDemoMode || !engineRef.current) return "";
    const matchState = engineRef.current.getMatchState();
    const inputLower = input.toLowerCase();
    const highestGate = getHighestDensityGateFromMetrics(engineRef.current.getMetrics());

    if (inputLower.includes("gate") || inputLower.includes("crowd") || inputLower.includes("security")) {
      const metrics = engineRef.current.getMetrics();
      return `Gate monitoring update: G1=${metrics.gate1}, G2=${metrics.gate2}, G3=${metrics.gate3}, G4=${metrics.gate4}, G5=${metrics.gate5}, G6=${metrics.gate6}, G7=${metrics.gate7}, G8=${metrics.gate8}. Highest congestion at ${highestGate}.`;
    }
    if (inputLower.includes("match") || inputLower.includes("score") || inputLower.includes("time")) {
      return `Match status at MetLife Stadium — FIFA World Cup 26: ${matchState.phase}, minute ${matchState.minute}, Score ${matchState.homeScore}-${matchState.awayScore}. ${matchState.phase === "half-time" ? "Crowd movement increasing through concourse." : matchState.phase === "full-time" ? "All gates actively managing exit flow." : "Crowd density stable at all gates."}`;
    }
    if (inputLower.includes("staff")) {
      return "Staff alert system active. All gates under surveillance. Gate alerts are being generated for any threshold breaches. Log entries being recorded to admin panel.";
    }
    return `Systems nominal. Current crowd: ${engineRef.current.getCrowdCount()} monitored individuals. Active gate alerts: ${engineRef.current.getGateEvents().length}. Match: ${matchState.homeScore}-${matchState.awayScore} (${matchState.phase}).`;
  }, [isDemoMode]);

  const injectDemoQuery = useCallback((): string | null => {
    if (!isDemoMode) return null;
    const queries = [
      "What's the crowd situation at Gate G3?",
      "Need shuttle schedule update",
      "Gate G2 is getting busy",
      "Security status at all gates",
      "Shuttle wait time at Main Hub?",
      "Are there any gate closures?",
      "Half-time crowd movement update",
      "Egress plan for Gate G5",
    ];
    const index = Math.floor(Math.random() * queries.length);
    return queries[index];
  }, [isDemoMode]);

  const getCrowdPositionsFn = useCallback((): CrowdPosition[] => {
    if (!isDemoMode || !engineRef.current) return [];
    return engineRef.current.getCrowdPositions();
  }, [isDemoMode]);

  const getCrowdCountFn = useCallback((): number => {
    if (!isDemoMode || !engineRef.current) return 0;
    return engineRef.current.getCrowdCount();
  }, [isDemoMode]);

  const getGateEventsFn = useCallback((): GateEvent[] => {
    if (!isDemoMode || !engineRef.current) return [];
    return engineRef.current.getGateEvents();
  }, [isDemoMode]);

  const getRecentGateEventsFn = useCallback((minutesAge: number): GateEvent[] => {
    if (!isDemoMode || !engineRef.current) return [];
    return engineRef.current.getRecentGateEvents(minutesAge);
  }, [isDemoMode]);

  const getAdminLogsFn = useCallback((): AdminLogEntry[] => {
    if (!isDemoMode || !engineRef.current) return [];
    return engineRef.current.getAdminLogs();
  }, [isDemoMode]);

  const getRecentAdminLogsFn = useCallback((count: number): AdminLogEntry[] => {
    if (!isDemoMode || !engineRef.current) return [];
    return engineRef.current.getRecentAdminLogs(count);
  }, [isDemoMode]);

  const getMatchStateFn = useCallback((): MatchSimulationState | null => {
    if (!isDemoMode || !engineRef.current) return null;
    return engineRef.current.getMatchState();
  }, [isDemoMode]);

  const setRealUserCountFn = useCallback((count: number) => {
    if (engineRef.current) engineRef.current.setRealUserCount(count);
  }, []);

  const contextValue = useMemo(() => ({
    isDemoMode,
    toggleDemo,
    demoElapsed,
    getMetrics,
    getTelemetry,
    getDemoAiResponse: getDemoAiResponseFn,
    injectDemoQuery,
    getCrowdPositions: getCrowdPositionsFn,
    getCrowdCount: getCrowdCountFn,
    getGateEvents: getGateEventsFn,
    getRecentGateEvents: getRecentGateEventsFn,
    getAdminLogs: getAdminLogsFn,
    getRecentAdminLogs: getRecentAdminLogsFn,
    getMatchState: getMatchStateFn,
    setRealUserCount: setRealUserCountFn,
  }), [
    isDemoMode,
    toggleDemo,
    demoElapsed,
    getMetrics,
    getTelemetry,
    getDemoAiResponseFn,
    injectDemoQuery,
    getCrowdPositionsFn,
    getCrowdCountFn,
    getGateEventsFn,
    getRecentGateEventsFn,
    getAdminLogsFn,
    getRecentAdminLogsFn,
    getMatchStateFn,
    setRealUserCountFn,
  ]);

  return (
    <DemoContext.Provider value={contextValue}>
      {children}
    </DemoContext.Provider>
  );
}

function getHighestDensityGateFromMetrics(metrics: GateMetrics): string {
  const order = ["gate3", "gate2", "gate5", "gate1", "gate4", "gate6", "gate7", "gate8"];
  for (const gate of order) {
    if (metrics[gate as keyof GateMetrics] === "high") return gate;
  }
  return "gate1";
}

export function DemoModeButton() {
  const demo = useDemoMode();
  if (!demo) return null;

  const minutes = Math.floor(demo.demoElapsed / 60000);
  const seconds = Math.floor((demo.demoElapsed % 60000) / 1000);
  const elapsedStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <button
      onClick={demo.toggleDemo}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-[0.15em] uppercase transition-all ${
        demo.isDemoMode
          ? "bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30"
          : "bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/50 text-zinc-400 hover:text-amber-400"
      }`}
    >
      <span className="relative z-10 flex items-center gap-2">
        {demo.isDemoMode ? (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            DEMO LIVE · {elapsedStr}
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
