"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { AICopilotChat } from "./AICopilotChat";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConnectionGuard } from "@/components/ConnectionGuard";
import { useMatchData } from "@/hooks/useMatchData";
import { StadiumTelemetry } from "@/types/telemetry";
import { useDemoMode } from "./DemoController";
import { useCrowdDetection } from "@/hooks/useCrowdDetection";

const TELEMETRY_POLL_INTERVAL = 30000;

export default function FanHub() {
  const { liveMatch, loading, isDemoMode } = useMatchData();
  const demoContext = useDemoMode();
  const { consented, status, currentGate, nearbyDistanceM, nearbyCount, toggleConsent } = useCrowdDetection();

  const [telemetry, setTelemetry] = useState<StadiumTelemetry | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(true);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const [matchFetched, setMatchFetched] = useState(false);

  useEffect(() => {
    if (!loading) setMatchFetched(true);
  }, [loading]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isDemoMode) {
      setTelemetryLoading(false);
      return;
    }

    const fetchTelemetry = async () => {
      try {
        setTelemetryLoading(true);
        const res = await fetch("/api/telemetry");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data && data.nearestGate && data.nearestHub && data.weatherAdvisory) {
          setTelemetry(data);
        } else {
          setTelemetry(null);
        }
      } catch {
        setTelemetry(null);
      } finally {
        setTelemetryLoading(false);
        setHasFetchedOnce(true);
      }
    };

    fetchTelemetry();
    intervalRef.current = setInterval(fetchTelemetry, TELEMETRY_POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isDemoMode]);

  const showLoading = (loading && !matchFetched) || (telemetryLoading && !hasFetchedOnce);

  const activeMatch = liveMatch || (isDemoMode ? null : {
    id: "fallback",
    homeTeam: "United States",
    awayTeam: "England",
    homeScore: 2,
    awayScore: 1,
    status: "live" as const,
    utcDate: new Date().toISOString(),
    minute: 74,
    stadiumName: null,
  });

  const effectiveMatchStatus = activeMatch?.status;
  const effectiveMatchScore = activeMatch ? {
    homeScore: activeMatch.homeScore,
    awayScore: activeMatch.awayScore,
    homeTeam: activeMatch.homeTeam,
    awayTeam: activeMatch.awayTeam,
  } : null;

  const activeTelemetry = (() => {
    if (isDemoMode && demoContext) {
      return demoContext.getTelemetry() ?? null;
    }
    return telemetry;
  })();

  if (showLoading) {
    return (
      <ConnectionGuard>
        <div className="flex-1 w-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase italic">
              {isDemoMode ? "Starting Demo..." : "Fetching Live Data..."}
            </p>
          </div>
        </div>
      </ConnectionGuard>
    );
  }

  return (
    <ConnectionGuard>
      <div className="flex-1 w-full flex flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card
            data-section="ai-chat"
            className="min-h-[600px] flex flex-col overflow-hidden p-0"
          >
            <AICopilotChat
              matchStatus={effectiveMatchStatus}
              matchScore={effectiveMatchScore}
              liveMatch={liveMatch}
              stadiumName={activeMatch?.stadiumName ?? null}
              matchPersona="miri"
              gateDensity={(activeTelemetry?.gateMetrics ?? null) as Record<string, string> | null}
              language="en"
              trackingEnabled={consented}
              location={currentGate ?? undefined}
              transitWaitTime={activeTelemetry?.nearestHub?.waitTime}
              weatherCondition={activeTelemetry?.weatherAdvisory?.condition}
            />
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase italic">
                Crowd Detection
              </h2>
              <Badge
                variant={consented ? "default" : "secondary"}
                className="text-[9px] font-mono tracking-wider"
              >
                {status === "detecting" ? "LIVE" : status === "denied" ? "BLOCKED" : consented ? "ON" : "OFF"}
              </Badge>
            </div>
            <p className="text-[10px] text-zinc-500 font-mono mb-3">
              Opt in to share anonymized geofence signals. Helps us route you and
              the crowd safely. No GPS trail is stored (D9).
            </p>
            {consented && currentGate && (
              <p className="text-[10px] text-emerald-400 font-mono mb-3">
                You are near {currentGate}
                {nearbyDistanceM !== null ? ` (${nearbyDistanceM}m)` : ""}
                {nearbyCount !== null && nearbyCount > 0
                  ? ` · ~${nearbyCount} others near you`
                  : ""}
              </p>
            )}
            <button
              type="button"
              onClick={() => void toggleConsent()}
              className="w-full py-2 rounded-xl text-[10px] font-black tracking-[0.2em] uppercase italic border border-emerald-600/40 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-900/30 transition-colors"
            >
              {consented ? "Disable Detection" : "Enable Detection"}
            </button>
          </Card>
        </motion.div>
      </div>
    </ConnectionGuard>
  );
}
