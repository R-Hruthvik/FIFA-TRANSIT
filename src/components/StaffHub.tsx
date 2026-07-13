"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { LiveStatusCards } from "./LiveStatusCards";
import { OperationalInsights } from "./OperationalInsights";
import { LiveQueryTicker } from "./LiveQueryTicker";
import { ChartLineUp, Database } from "@phosphor-icons/react";
import { GateMetrics, StadiumTelemetry } from "@/types/telemetry";
import { STATUS_CLASSES } from "@/constants/theme";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

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

        {/* Gate Performance Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <ChartLineUp size={18} weight="duotone" className="text-emerald-400" />
              <h2 className="text-[10px] font-black tracking-[0.2em] text-white uppercase italic">
                Gate Performance Metrics
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(["gateA", "gateB", "gateC", "gateD"] as const).map((gate) => {
                const status = metrics[gate];
                return (
                  <button
                    key={gate}
                    onClick={() => setGateFilter(gateFilter === gate ? null : gate)}
                    className={`relative p-4 rounded-xl border transition-all duration-200 text-left ${
                      STATUS_CLASSES[status].bg
                    } ${STATUS_CLASSES[status].border} ${
                      gateFilter === gate
                        ? "ring-2 ring-emerald-500 scale-[1.02]"
                        : "hover:scale-[1.02]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                        {gate.replace("gate", "Gate ")}
                      </span>
                      <div
                        className={`w-2 h-2 rounded-full ${STATUS_CLASSES[status].dot}`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width:
                              status === "high"
                                ? "90%"
                                : status === "medium"
                                  ? "55%"
                                  : "20%",
                          }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full rounded-full ${STATUS_CLASSES[status].bar}`}
                        />
                      </div>
                      <span
                        className={`text-[11px] font-bold ${STATUS_CLASSES[status].text}`}
                      >
                        {status === "high"
                          ? "CRITICAL"
                          : status === "medium"
                            ? "WARNING"
                            : "NORMAL"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

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
            <OperationalInsights />
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
