"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { LiveStatusCards } from "./LiveStatusCards";
import { OperationalInsights } from "./OperationalInsights";
import { LiveQueryTicker } from "./LiveQueryTicker";
import { HeatmapSelector, getStoredVariant } from "./HeatmapSelector";
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

const HEATMAP_COMPONENTS: Record<HeatmapVariant, React.ComponentType<{ metrics: GateMetrics; gateFilter: string | null; onGateClick: (gate: string) => void }>> = {
  "stadium-svg": StadiumSVG,
  "thermal-grid": ThermalGrid,
  "stadium-map": StadiumMap,
};

export default function StaffHub() {
  const [metrics, setMetrics] = useState<GateMetrics>({
    gateA: "low",
    gateB: "low",
    gateC: "low",
    gateD: "low",
  });
  const [telemetry, setTelemetry] = useState<StadiumTelemetry>({
    nearestGate: { label: "SCANNING...", status: "open" },
    nearestHub: { label: "SCANNING...", waitTime: 0 },
    weatherAdvisory: { label: "SCANNING...", condition: "clear" },
  });
  const [gateFilter, setGateFilter] = useState<string | null>(null);
  const [heatmapVariant, setHeatmapVariant] = useState<HeatmapVariant>(() => getStoredVariant());

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const [metricsRes, telemetryRes] = await Promise.all([
          fetch("/api/staff/metrics"),
          fetch("/api/telemetry"),
        ]);
        const metricsData = await metricsRes.json();
        const telemetryData = await telemetryRes.json();
        if (metricsData.metrics) setMetrics(metricsData.metrics);
        if (telemetryData) setTelemetry(telemetryData);
      } catch (error) {
        console.error("Failed to sync telemetry:", error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleGateClick = (gate: string) => {
    setGateFilter(gateFilter === gate ? null : gate);
  };

  const HeatmapComponent = HEATMAP_COMPONENTS[heatmapVariant];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left Column: Live Gate + Query Stream (9/12 cols) */}
      <div className="lg:col-span-9 flex flex-col gap-6">
        {/* Live Status Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase italic">
                  Live Stadium Pulse
                </h2>
              </div>
              <Badge variant="secondary" className="text-[9px] font-mono tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 inline-block animate-pulse" />
                LIVE
              </Badge>
            </div>
            <LiveStatusCards data={telemetry} />
          </Card>
        </motion.div>

        {/* Spatial Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card data-section="heatmap" className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <ChartLineUp size={18} weight="duotone" className="text-emerald-400" />
                <h2 className="text-[10px] font-black tracking-[0.2em] text-white uppercase italic">
                  Spatial Congestion Heatmap
                </h2>
              </div>
              <HeatmapSelector current={heatmapVariant} onChange={setHeatmapVariant} />
            </div>

            {gateFilter && (
              <div className="mb-4 flex items-center gap-2">
                <Badge variant="outline" className="gap-1.5 border-amber-500/30 text-amber-500 text-[10px] font-bold">
                  Filtering: {gateFilter}
                </Badge>
                <button
                  onClick={() => setGateFilter(null)}
                  className="text-[10px] text-zinc-500 hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
            )}

            <HeatmapComponent metrics={metrics} gateFilter={gateFilter} onGateClick={handleGateClick} />

            <Separator className="my-6" />

            {/* Query Stream */}
            <LiveQueryTicker gateFilter={gateFilter} />
          </Card>
        </motion.div>
      </div>

      {/* Right Sidebar: Intelligence (3/12 cols) */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 h-fit">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <h2 className="text-[10px] font-black tracking-[0.2em] text-amber-400 uppercase italic">
                Tactical Insights
              </h2>
            </div>
            <OperationalInsights metrics={metrics} transitWaitTime={telemetry.nearestHub.waitTime} />
          </Card>
        </motion.div>

        {/* Enforcement surfaces (D11) */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <EnforcementPanel />
        </motion.div>
      </div>
    </div>
  );
}
