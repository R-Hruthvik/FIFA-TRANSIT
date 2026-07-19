/**
 * EgressPlanCard — Fan-facing egress plan with D9 safety spine
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D7 — Headline feature = post-match egress orchestration
 * D8 — Delivery = B baseline (cached) + A enhancement (live)
 * D9 — Low-confidence → AI defers to stewards (the safety spine)
 *
 * Two states:
 *   1. NORMAL: shows the cached + live-regulated egress plan
 *   2. DEFERRED: confidence too low → big "FOLLOW STEWARDS" surface
 *
 * The deferred state is NOT a stub — it's the primary safety feature.
 */

"use client";

import { useEgressPlan } from "@/hooks/useEgressPlan";
import { motion } from "motion/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Clock,
  Bus,
  ShieldCheck,
  Warning,
  WifiSlash,
  ArrowsClockwise,
} from "@phosphor-icons/react";
import type { EgressPlan } from "@/types/position";

interface EgressPlanCardProps {
  userPosition?: unknown;
  language?: string;
  matchEnded?: boolean;
}

export function EgressPlanCard({
  userPosition,
  language = "en",
  matchEnded = false,
}: EgressPlanCardProps) {
  const { plan, isLoading, isLive, gateSummary, refresh } = useEgressPlan({
    userPosition,
    language,
    matchEnded,
  });

  if (isLoading && !plan) {
    return (
      <Card data-section="egress-plan" className="p-6">
        <div className="animate-pulse flex items-center gap-3">
          <ArrowsClockwise size={16} className="text-emerald-400 animate-spin" />
          <span className="text-[11px] text-zinc-400">Computing your egress plan...</span>
        </div>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card data-section="egress-plan" className="p-6">
        <div className="flex items-center gap-3">
          <Warning size={16} className="text-amber-400" />
          <span className="text-[11px] text-zinc-400">
            Egress plan unavailable. Follow steward directions.
          </span>
        </div>
      </Card>
    );
  }

  // ── D9: Low confidence → defer to stewards ──────────────────────────

  if (plan.deferToStewards) {
    return (
      <Card
        data-section="egress-plan"
        data-state="deferred"
        className="p-6 border-amber-500/30 bg-amber-500/5"
      >
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck size={18} weight="duotone" className="text-amber-400" />
          <h2 className="text-[10px] font-black tracking-[0.2em] text-amber-400 uppercase italic">
            Follow Steward Directions
          </h2>
        </div>
        <p className="text-[13px] text-amber-100 leading-relaxed">{plan.instruction}</p>
        <p className="text-[10px] text-amber-400/70 mt-3">
          Crowd data is insufficient for automated routing. Venue staff will guide
          you safely. This is a safety feature, not a failure.
        </p>
      </Card>
    );
  }

  // ── NORMAL: Show the egress plan ──────────────────────────────────

  const leaveInMin = Math.max(0, Math.round((plan.leaveAt - Date.now()) / 60_000));

  return (
    <Card data-section="egress-plan" data-state="active" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <MapPin size={18} weight="duotone" className="text-emerald-400" />
          <h2 className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase italic">
            Your Egress Plan
          </h2>
        </div>
        <Badge
          variant={isLive ? "default" : "secondary"}
          className="text-[9px] font-mono gap-1.5"
        >
          {isLive ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </>
          ) : (
            <>
              <WifiSlash size={10} />
              CACHED
            </>
          )}
        </Badge>
      </div>

      {/* Primary instruction */}
      <p className="text-[14px] font-semibold text-white leading-relaxed mb-4">
        {plan.instruction}
      </p>

      {/* Detail grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={12} className="text-emerald-400" />
            <span className="text-[9px] text-zinc-400 uppercase tracking-wide">Leave In</span>
          </div>
          <span className="text-[16px] font-bold text-white">
            {leaveInMin === 0 ? "Now" : `${leaveInMin}m`}
          </span>
        </div>

        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={12} className="text-emerald-400" />
            <span className="text-[9px] text-zinc-400 uppercase tracking-wide">Gate</span>
          </div>
          <span className="text-[16px] font-bold text-white">{plan.gateId}</span>
        </div>

        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={12} className="text-emerald-400" />
            <span className="text-[9px] text-zinc-400 uppercase tracking-wide">Walk ETA</span>
          </div>
          <span className="text-[16px] font-bold text-white">{plan.etaMinutes}m</span>
        </div>

        <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
          <div className="flex items-center gap-2 mb-1">
            <Bus size={12} className="text-emerald-400" />
            <span className="text-[9px] text-zinc-400 uppercase tracking-wide">Transit</span>
          </div>
          <span className="text-[16px] font-bold text-white">{plan.transitEtaMinutes}m</span>
        </div>
      </div>

      {/* Capacity indicator */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[9px] text-zinc-400 uppercase tracking-wide">
            Gate Capacity
          </span>
          <span
            className={`text-[10px] font-bold ${
              plan.gateCapacityPct >= 80
                ? "text-red-400"
                : plan.gateCapacityPct >= 50
                  ? "text-amber-400"
                  : "text-emerald-400"
            }`}
          >
            {plan.gateCapacityPct}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              plan.gateCapacityPct >= 80
                ? "bg-red-500"
                : plan.gateCapacityPct >= 50
                  ? "bg-amber-500"
                  : "bg-emerald-500"
            }`}
            style={{ width: `${plan.gateCapacityPct}%` }}
          />
        </div>
      </div>

      {/* Gate summary overlay (from SSE broadcast) */}
      {gateSummary && (
        <div className="flex flex-wrap gap-2 mb-4">
          {gateSummary.map((g) => (
            <Badge
              key={g.gateId}
              variant={g.recommended ? "default" : "outline"}
              className={`text-[9px] ${
                g.avoid
                  ? "text-red-400 border-red-400/30"
                  : g.recommended
                    ? "text-emerald-400 bg-emerald-500/10"
                    : "text-zinc-400"
              }`}
            >
              {g.gateId}: {g.capacityPct}%
            </Badge>
          ))}
        </div>
      )}

      {/* Stale warning */}
      {plan.stale && (
        <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 mb-3">
          <Warning size={12} className="text-amber-400" />
          <span className="text-[10px] text-amber-400">
            Plan may be outdated due to changing conditions. Refreshing...
          </span>
        </div>
      )}

      {/* Refresh button */}
      <button
        onClick={refresh}
        className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-[10px] font-bold text-zinc-300"
      >
        <ArrowsClockwise size={12} />
        Refresh Plan
      </button>
    </Card>
  );
}
