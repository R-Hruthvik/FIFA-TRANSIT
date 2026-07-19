"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useMatch } from "@/data/hooks/useMatch";
import { useMetrics } from "@/data/hooks/useMetrics";
import { useTelemetry } from "@/data/hooks/useTelemetry";
import { useCrowd } from "@/data/hooks/useCrowd";
import { LiveStatusCards } from "./LiveStatusCards";
import { OperationalInsights } from "./OperationalInsights";
import { LiveQueryTicker } from "./LiveQueryTicker";
import { HeatmapSelector } from "./HeatmapSelector";
import { StadiumSVG } from "./heatmap/StadiumSVG";
import { ThermalGrid } from "./heatmap/ThermalGrid";
import { StadiumMap } from "./heatmap/StadiumMap";
import { HeatmapVariant } from "./heatmap";
import { EnforcementPanel } from "./EnforcementPanel";
import { StaffCommandBar } from "./StaffCommandBar";
import { ChartLineUp } from "@phosphor-icons/react";
import { GateMetrics } from "@/types/telemetry";
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

export default function StaffHub() {
  const { match: liveMatch } = useMatch();
  const metrics = useMetrics();
  const telemetry = useTelemetry();
  const { count: crowdCount } = useCrowd();

  const [heatmapVariant, setHeatmapVariant] = useState<HeatmapVariant>("stadium-svg");
  const [selectedGate, setSelectedGate] = useState<string | null>(null);
  const HeatmapComponent = HEATMAP_COMPONENTS[heatmapVariant];

  const hasMetrics = metrics && Object.keys(metrics).length > 0;
  const [hasError, setHasError] = useState(false);

  return (
    <ConnectionGuard>
      <div className="flex-1 w-full flex flex-col gap-6">
        {/* Error banner when sync fails */}
        {hasError && (
          <div className="p-4 rounded-xl bg-red-950/20 border border-red-900/40 text-red-400 text-xs">
            Sync error
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
              {telemetry ? (
                <LiveStatusCards data={telemetry} />
              ) : (
                <p className="text-xs text-zinc-400">Live telemetry unavailable</p>
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
              {metrics ? (
                <OperationalInsights metrics={metrics} transitWaitTime={telemetry?.nearestHub?.waitTime} />
              ) : (
                <p className="text-xs text-zinc-400">Operational data unavailable</p>
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
              {hasMetrics ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-[9px] text-zinc-400 uppercase tracking-wider mb-1">Total Crowd</p>
                    <p className="text-lg font-black text-emerald-400">
                      {crowdCount}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-[9px] text-zinc-400 uppercase tracking-wider mb-1">Active Gates</p>
                    <p className="text-lg font-black text-red-400">
                      {Object.values(metrics!).filter(v => v !== "low").length}
                    </p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-[9px] text-zinc-400 uppercase tracking-wider mb-1">Crowd Density</p>
                    <p className="text-lg font-black text-amber-400">
                      {Math.round((Object.values(metrics!).filter(v => v === "high").length / 8) * 100)}%
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3 py-6 text-zinc-400">
                  <div className="w-6 h-6 border-2 border-emerald-500/40 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs font-mono tracking-wider uppercase italic">
                    Awaiting Inbound Crowd Scan...
                  </p>
                </div>
              )}
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

        {/* Agentic AI Command Bar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.12 }}
        >
          <StaffCommandBar
            match={liveMatch}
            stadiumName={liveMatch?.stadiumName ?? null}
          />
        </motion.div>

        {/* Heatmap + Query Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="p-6" data-section="heatmap">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <ChartLineUp size={20} weight="duotone" className="text-emerald-400" />
                  <h2 className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase italic">
                    Congestion Heatmap
                  </h2>
                </div>
                <HeatmapSelector current={heatmapVariant} onChange={setHeatmapVariant} />
              </div>
              <div className="h-[350px] overflow-hidden">
                {hasMetrics && HeatmapComponent ? (
                  <HeatmapComponent
                    metrics={metrics!}
                    gateFilter={null}
                    onGateClick={(gate) => setSelectedGate(gate)}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-zinc-400">
                    <div className="w-8 h-8 border-2 border-emerald-500/40 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-mono tracking-wider uppercase italic">
                      Awaiting Inbound Crowd Scan...
                    </p>
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
