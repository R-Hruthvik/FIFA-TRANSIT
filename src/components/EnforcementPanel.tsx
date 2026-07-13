/**
 * EnforcementPanel — Staff enforcement surface
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D11 — Enforcement = both, stewards as hard backstop
 *      Staff get the live aggregate dashboard to enforce physically +
 *      trigger the D9 deferral when a gate breaches capacity live.
 *
 * Shows:
 *   - Live alerts (critical capacity + low confidence)
 *   - Gate enforcement controls (trigger steward deferral)
 *   - Capacity breach visualization
 */

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Warning, Users, CaretRight } from "@phosphor-icons/react";
import type { GateCrowd, GateSummary } from "@/types/position";

interface StaffAlert {
  type: "critical" | "low_confidence";
  gateId: string;
  message: string;
  severity: "critical" | "warning";
}

interface StaffData {
  gates: GateCrowd[];
  summary: GateSummary[];
  alerts: StaffAlert[];
  staggerStatus: { active: boolean; totalTrackedUsers: number; egressWindowMinutes?: number };
  enforceableGates: string[];
}

export function EnforcementPanel() {
  const [data, setData] = useState<StaffData | null>(null);
  const [enforcedGates, setEnforcedGates] = useState<Set<string>>(new Set());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/track/staff");
        if (res.ok) {
          const json = await res.json();
          setData(json);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error("Failed to fetch staff data:", error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000); // Live updates every 3s
    return () => clearInterval(interval);
  }, []);

  const toggleEnforcement = (gateId: string) => {
    setEnforcedGates((prev) => {
      const next = new Set(prev);
      if (next.has(gateId)) {
        next.delete(gateId);
      } else {
        next.add(gateId);
      }
      return next;
    });
  };

  return (
    <Card data-section="enforcement" className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShieldCheck size={18} weight="duotone" className="text-emerald-400" />
          <h2 className="text-[10px] font-black tracking-[0.2em] text-white uppercase italic">
            Enforcement & Alerts
          </h2>
        </div>
        {lastUpdate && (
          <Badge variant="secondary" className="text-[9px] font-mono">
            {lastUpdate.toLocaleTimeString()}
          </Badge>
        )}
      </div>

      {/* Live alerts */}
      <div className="space-y-2 mb-6">
        <AnimatePresence>
          {data?.alerts.map((alert) => (
            <motion.div
              key={`${alert.gateId}-${alert.type}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                alert.severity === "critical"
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-amber-500/30 bg-amber-500/5"
              }`}
            >
              <Warning
                size={16}
                weight="duotone"
                className={alert.severity === "critical" ? "text-red-400 mt-0.5" : "text-amber-400 mt-0.5"}
              />
              <div className="flex-1">
                <p className="text-[11px] font-medium text-white">{alert.message}</p>
                {alert.type === "low_confidence" && (
                  <Badge variant="outline" className="mt-1 text-[9px] text-amber-400 border-amber-400/30">
                    Defer to stewards
                  </Badge>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {data?.alerts.length === 0 && (
          <div className="text-[11px] text-zinc-500 italic">No active alerts</div>
        )}
      </div>

      {/* Gate enforcement controls */}
      <div className="space-y-2">
        <h3 className="text-[9px] font-black tracking-[0.15em] text-zinc-500 uppercase mb-2">
          Gate Capacity Enforcement
        </h3>

        {data?.gates.map((gate) => {
          const pct = Math.round((gate.count / gate.capacityThreshold) * 100);
          const isEnforced = enforcedGates.has(gate.gateId);
          const isCritical = pct >= 80;

          return (
            <div
              key={gate.gateId}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                isCritical
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-white/5 bg-white/[0.02]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isCritical ? "bg-red-500 animate-pulse" : "bg-emerald-500"
                  }`}
                />
                <span className="text-[12px] font-semibold text-white">{gate.gateId}</span>
                <span className="text-[10px] text-zinc-500">{pct}% capacity</span>
                <span className="text-[9px] text-zinc-600">
                  conf: {(gate.confidence * 100).toFixed(0)}%
                </span>
              </div>

              <button
                onClick={() => toggleEnforcement(gate.gateId)}
                disabled={!isCritical && !isEnforced}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[9px] font-bold transition-colors ${
                  isEnforced
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : isCritical
                      ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
                      : "bg-white/5 text-zinc-600 cursor-not-allowed"
                }`}
              >
                {isEnforced ? "Enforced" : "Enforce"}
                <CaretRight size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Stagger status */}
      {data?.staggerStatus.active && (
        <div className="mt-4 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-emerald-400" />
            <span className="text-[10px] font-semibold text-emerald-400">
              Egress Stagger Active
            </span>
          </div>
          <p className="text-[9px] text-zinc-500 mt-1">
            {data.staggerStatus.totalTrackedUsers} users tracked •{" "}
            {data.staggerStatus.egressWindowMinutes}min window
          </p>
        </div>
      )}
    </Card>
  );
}
