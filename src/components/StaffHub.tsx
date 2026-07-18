"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useDemoMode } from "./DemoController";
import { LiveStatusCards } from "./LiveStatusCards";
import { OperationalInsights } from "./OperationalInsights";
import { LiveQueryTicker } from "./LiveQueryTicker";
import { HeatmapSelector } from "./HeatmapSelector";
import { StadiumSVG } from "./heatmap/StadiumSVG";
import { ThermalGrid } from "./heatmap/ThermalGrid";
import { StadiumMap } from "./heatmap/StadiumMap";
import { HeatmapVariant } from "./heatmap";
import { EnforcementPanel } from "./EnforcementPanel";
import { ChartLineUp } from "@phosphor-icons/react";
import { GateMetrics, StadiumTelemetry } from "@/types/telemetry";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ConnectionGuard } from "@/components/ConnectionGuard";
import { GateAlertsPanel } from "./GateAlertsPanel";
import { AdminLogsPanel } from "./AdminLogsPanel";

const HEATMAP_COMPONENTS: Record<HeatmapVariant, React.ComponentType<{ metrics: GateMetrics; gateFilter: string | null; onGateClick: (gate: string) => void }>> = {
  "stadium-svg": StadiumSVG,
  "thermal-grid": ThermalGrid,
  "stadium-map": StadiumMap,
};

const STAFF_POLL_INTERVAL = 30000; // 30 seconds to avoid frequent reloads

export default function StaffHub() {
  const demo = useDemoMode();

  // All hooks declared unconditionally at the top
  // Initialize as null — no placeholder fake data
  const [metrics, setMetrics] = useState<GateMetrics | null>(null);
  const [telemetry, setTelemetry] = useState<StadiumTelemetry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [heatmapVariant, setHeatmapVariant] = useState<HeatmapVariant>("stadium-svg");
  const HeatmapComponent = HEATMAP_COMPONENTS[heatmapVariant];
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!demo) {
      return;
    }

    if (demo.isDemoMode) {
      setLoading(false);
      setError(null);
      if (demo.getMetrics) setMetrics(demo.getMetrics());
      if (demo.getTelemetry) setTelemetry(demo.getTelemetry() || null);
      return;
    }

    const sync = async () => {
      try {
        setError(null);
        const [metricsRes, telemetryRes] = await Promise.all([
          fetch("/api/staff/metrics"),
          fetch("/api/telemetry"),
        ]);

        if (!mountedRef.current) return;

        if (metricsRes.ok) {
          const data = await metricsRes.json();
          if (data.metrics) setMetrics(data.metrics);
        }

        if (telemetryRes.ok) {
          const data = await telemetryRes.json();
          setTelemetry(data);
        }
      } catch (err: any) {
        if (mountedRef.current) {
          setError(err.message || "Failed to sync staff data");
          console.error("Failed to sync telemetry:", err);
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    sync();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(sync, STAFF_POLL_INTERVAL);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [demo, demo?.isDemoMode]);

  // Loading state (conditional render after all hooks)
  if (loading && !demo?.isDemoMode) {
    return (
      <ConnectionGuard>
        <div className="flex-1 w-full flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase italic">
              Loading Staff Dashboard...
            </p>
          </div>
        </div>
      </ConnectionGuard>
    );
  }

  // In demo mode, use demo engine data (no loading needed)
  if (demo?.isDemoMode && demo.getMetrics) {
    if (demo.getMetrics()) setMetrics(demo.getMetrics());
    if (demo.getTelemetry()) setTelemetry(demo.getTelemetry() || null);
  }

  // Get active data - in demo mode use demo engine, otherwise use local state
  const activeMetrics = demo?.isDemoMode && demo.getMetrics ? demo.getMetrics() : metrics;
  const activeTelemetry = demo?.isDemoMode && demo.getTelemetry ? demo.getTelemetry() : telemetry;
  const hasError = !!error;

  return (
    <ConnectionGuard>
      <div className="flex-1 w-full flex flex-col gap-6">
        {/* Error banner when sync fails */}
        {hasError && (
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/40 text-red-400 text-xs">
            {error}
          </div>
        )}

        {/* Top row: Status + Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <h2 className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase italic">
                  Live Status
                </h2>
              </div>
              {activeTelemetry ? (
                <LiveStatusCards data={activeTelemetry} />
              ) : (
                <p className="text-xs text-zinc-500">Live telemetry unavailable</p>
              )}
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <h2 className="text-[10px] font-black tracking-[0.2em] text-amber-400 uppercase italic">
                  Tactical Insights
                </h2>
              </div>
              {activeMetrics ? (
                <OperationalInsights metrics={activeMetrics} transitWaitTime={activeTelemetry?.nearestHub.waitTime ?? 0} />
              ) : (
                <p className="text-xs text-zinc-500">Operational data unavailable</p>
              )}
            </Card>
          </motion.div>
        </div>

        {/* Crowd Count and Gate Alerts */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-[11px] font-black tracking-[0.15em] text-emerald-400 uppercase italic">
                  Live Crowd Monitor
                </h3>
                <Badge className="text-[9px] bg-emerald-500/20 text-emerald-400">LIVE</Badge>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Total Crowd</p>
                  <p className="text-lg font-black text-emerald-400">
                    {demo?.getCrowdCount ? demo.getCrowdCount() : 0}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Active Gates</p>
                  <p className="text-lg font-black text-red-400">
                    {metrics ? Object.values(metrics).filter(v => v !== "low").length : 0}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-[9px] text-zinc-500 uppercase tracking-wider mb-1">Crowd Density</p>
                  <p className="text-lg font-black text-amber-400">
                    {metrics ? Math.round((Object.values(metrics).filter(v => v === "high").length / 8) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
            <GateAlertsPanel />
            <AdminLogsPanel />
          </div>
        </motion.div>

        {/* Enforcement surfaces (D11) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <EnforcementPanel />
        </motion.div>

        {/* Heatmap + Query Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <ChartLineUp size={20} weight="duotone" className="text-emerald-400" />
                  <h2 className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase italic">
                    Congestion Heatmap
                  </h2>
                </div>
                <HeatmapSelector current={heatmapVariant} onChange={setHeatmapVariant} />
              </div>
              <div className="h-[350px]">
                {activeMetrics && HeatmapComponent ? (
                  <HeatmapComponent
                    metrics={activeMetrics}
                    gateFilter={null}
                    onGateClick={() => {}}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-500 text-xs">
                    {activeMetrics ? "Select a heatmap view" : "Heatmap data unavailable"}
                  </div>
                )}
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6 h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase italic">
                  Live Fan Queries
                </h2>
              </div>
              <LiveQueryTicker />
            </Card>
          </motion.div>
        </div>
      </div>
    </ConnectionGuard>
  );
}
