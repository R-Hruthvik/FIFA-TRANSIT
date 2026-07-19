"use client";

import { motion, AnimatePresence } from "motion/react";
import { AICopilotChat } from "./AICopilotChat";
import { LiveStatusCards } from "./LiveStatusCards";
import { EgressPlanCard } from "./EgressPlanCard";
import { Card } from "@/components/ui/card";
import { ConnectionGuard } from "@/components/ConnectionGuard";
import { useMatch } from "@/data/hooks/useMatch";
import { useTelemetry } from "@/data/hooks/useTelemetry";
import { useCrowdDetection } from "@/hooks/useCrowdDetection";

export default function FanHub() {
  const { match: liveMatch } = useMatch();
  const telemetry = useTelemetry();
  const { consented, status, currentGate, nearbyDistanceM, nearbyCount, toggleConsent } = useCrowdDetection();

  const activeMatch = liveMatch || {
    id: "fallback",
    homeTeam: "United States",
    awayTeam: "England",
    homeScore: 2,
    awayScore: 1,
    status: "live" as const,
    utcDate: new Date().toISOString(),
    minute: 74,
    stadiumName: null,
  };

  const effectiveMatchStatus = activeMatch?.status;
  const effectiveMatchScore = activeMatch ? {
    homeScore: activeMatch.homeScore,
    awayScore: activeMatch.awayScore,
    homeTeam: activeMatch.homeTeam,
    awayTeam: activeMatch.awayTeam,
  } : null;

  const isLive = status === "detecting";
  const isBlocked = status === "denied";

  const statusLabel = isLive ? "LIVE" : isBlocked ? "BLOCKED" : consented ? "ON" : "OFF";
  const statusColor = isLive
    ? "text-emerald-400"
    : isBlocked
      ? "text-red-400"
      : consented
        ? "text-emerald-400"
        : "text-zinc-500";
  const dotColor = isLive
    ? "bg-emerald-400 shadow-[0_0_6px_2px_rgba(52,211,153,0.5)]"
    : isBlocked
      ? "bg-red-400"
      : consented
        ? "bg-emerald-500"
        : "bg-zinc-600";

  return (
    <ConnectionGuard>
      <div className="flex-1 w-full flex flex-col gap-6">

        {/* ── Crowd Detection Banner (top) ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div
            className="relative overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-950/60 backdrop-blur-xl"
            style={{
              background:
                consented
                  ? "linear-gradient(135deg, rgba(5,46,22,0.55) 0%, rgba(9,9,11,0.75) 100%)"
                  : "linear-gradient(135deg, rgba(24,24,27,0.6) 0%, rgba(9,9,11,0.8) 100%)",
            }}
          >
            {/* Ambient glow strip */}
            <div
              className="absolute top-0 left-0 right-0 h-px opacity-60"
              style={{
                background: consented
                  ? "linear-gradient(90deg, transparent, rgba(52,211,153,0.6), transparent)"
                  : "linear-gradient(90deg, transparent, rgba(113,113,122,0.3), transparent)",
              }}
            />

            <div className="flex items-center gap-4 px-5 py-4">
              {/* Animated pulse dot */}
              <div className="relative flex-shrink-0">
                <span className={`block w-2.5 h-2.5 rounded-full ${dotColor} transition-all duration-500`} />
                {isLive && (
                  <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
                )}
              </div>

              {/* Label + status */}
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-black tracking-[0.25em] text-zinc-500 uppercase mb-0.5">
                  Crowd Detection
                </p>
                <AnimatePresence mode="wait">
                  {consented && currentGate ? (
                    <motion.p
                      key="gate-info"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-[11px] font-semibold text-emerald-300 truncate"
                    >
                      Near {currentGate}
                      {nearbyDistanceM !== null ? ` · ${nearbyDistanceM}m` : ""}
                      {nearbyCount !== null && nearbyCount > 0 ? ` · ~${nearbyCount} others` : ""}
                    </motion.p>
                  ) : (
                    <motion.p
                      key="description"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-[11px] text-zinc-400 truncate"
                    >
                      Anonymized geofence signals · no GPS trail stored (D9)
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Status pill */}
              <span
                className={`flex-shrink-0 text-[9px] font-black tracking-[0.2em] px-2.5 py-1 rounded-full border font-mono transition-all duration-300 ${
                  isLive
                    ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-400"
                    : isBlocked
                      ? "border-red-500/30 bg-red-950/30 text-red-400"
                      : consented
                        ? "border-emerald-600/30 bg-emerald-950/20 text-emerald-500"
                        : "border-zinc-700/50 bg-zinc-900/30 text-zinc-500"
                }`}
              >
                {statusLabel}
              </span>

              {/* Toggle button */}
              <button
                type="button"
                onClick={() => void toggleConsent()}
                className={`flex-shrink-0 text-[9px] font-black tracking-[0.15em] uppercase px-3 py-1.5 rounded-xl transition-all duration-300 border ${
                  consented
                    ? "border-zinc-700/60 bg-zinc-800/40 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-300"
                    : "border-emerald-600/50 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-900/40 hover:border-emerald-500/60"
                }`}
              >
                {consented ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Live Status Cards ── */}
        {telemetry && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <h2 className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase italic">
                  Live Status
                </h2>
              </div>
              <LiveStatusCards data={telemetry} />
            </Card>
          </motion.div>
        )}

        {/* ── Egress Plan ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <EgressPlanCard matchEnded={effectiveMatchStatus === "finished"} />
        </motion.div>

        {/* ── AI Copilot Chat ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
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
              gateDensity={(telemetry?.gateMetrics ?? null) as Record<string, string> | null}
              language="en"
              trackingEnabled={consented}
              location={currentGate ?? undefined}
              transitWaitTime={telemetry?.nearestHub?.waitTime}
              weatherCondition={telemetry?.weatherAdvisory?.condition}
            />
          </Card>
        </motion.div>

      </div>
    </ConnectionGuard>
  );
}
