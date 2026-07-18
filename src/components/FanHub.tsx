"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { AICopilotChat } from "./AICopilotChat";
import { LiveQueryTicker } from "./LiveQueryTicker";
import { LiveStatusCards } from "./LiveStatusCards";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EgressPlanCard } from "./EgressPlanCard";
import { ConnectionGuard } from "@/components/ConnectionGuard";
import { useMatchData } from "@/hooks/useMatchData";
import { MatchScoreboard } from "./match/MatchScoreboard";
import { StadiumTelemetry } from "@/types/telemetry";

import { useDemoMode } from "./DemoController";
import { useCrowdDetection } from "@/hooks/useCrowdDetection";

const TELEMETRY_POLL_INTERVAL = 30000; // 30 seconds, synced with match polling

export default function FanHub() {
  const { liveMatch, loading, isMock, isDemoMode, error: matchError } = useMatchData();
  const demoContext = useDemoMode();
  const { consented, status, currentGate, nearbyDistanceM, nearbyCount, toggleConsent } = useCrowdDetection();

  const [telemetry, setTelemetry] = useState<StadiumTelemetry | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (isDemoMode) {
      setTelemetryLoading(false);
      setTelemetryError(null);
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
          setTelemetryError(null);
        } else {
          setTelemetry(null);
        }
      } catch (error) {
        console.error("Failed to fetch fan telemetry:", error);
        setTelemetryError("Unable to load live data");
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

  // Show loading only on initial load (not on every refresh).
  // In demo mode the match data is not fetched, so don't block on it.
  const matchBlocking = isDemoMode ? false : loading;
  const showLoading = (matchBlocking || (telemetryLoading && !hasFetchedOnce));

  // Determine what telemetry to show
  const activeTelemetry = (() => {
    if (isDemoMode && demoContext) {
      return demoContext.getTelemetry() ?? null;
    }
    return telemetry;
  })();

  // Show loading state only on first load
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
      {liveMatch && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <MatchScoreboard match={liveMatch} isMock={isMock} matchError={matchError} />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <Card className="p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase italic">
                Your Matchday Status
              </h2>
              {!isDemoMode && isMock && (
                <span className="text-[9px] font-mono text-amber-500/80 uppercase tracking-wider">
                  Offline Mode
                </span>
              )}
            </div>

            {telemetryError && !isDemoMode ? (
              <div className="p-8 border border-dashed border-red-900/40 rounded-2xl flex flex-col items-center justify-center bg-red-950/10">
                <p className="text-[10px] font-black tracking-widest text-red-400 uppercase italic text-center">
                  Unable to load live data
                </p>
                <p className="text-[9px] text-zinc-500 font-mono mt-2">{telemetryError}</p>
              </div>
            ) : activeTelemetry ? (
              <LiveStatusCards data={activeTelemetry} />
            ) : (
              <div className="p-8 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center">
                <p className="text-[10px] font-black tracking-widest text-amber-500/70 uppercase italic text-center">
                  No live telemetry data available
                </p>
                <p className="text-[9px] text-zinc-600 font-mono mt-2">Check API configuration in Settings</p>
              </div>
            )}
          </div>
          <LiveQueryTicker />
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.07 }}
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <EgressPlanCard language="en" />

        <Card data-section="ai-chat" className="min-h-[600px] flex flex-col overflow-hidden p-0">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase italic">
                FanAssist
              </h2>
            </div>
            <Badge variant="secondary" className="text-[9px] font-mono tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block animate-pulse" />
              ENCRYPTED
            </Badge>
          </div>
          <div className="flex-1 overflow-hidden">
            <AICopilotChat />
          </div>
        </Card>
      </motion.div>
      </div>
    </ConnectionGuard>
  );
}
