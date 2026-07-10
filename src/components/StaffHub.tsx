"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { LiveStatusCards } from "./LiveStatusCards";
import { OperationalInsights } from "./OperationalInsights";
import { LiveQueryTicker } from "./LiveQueryTicker";
import { ChartLineUp, Database } from "@phosphor-icons/react";
import { GateMetrics, StadiumTelemetry } from "@/types/telemetry";
import { STATUS_CLASSES } from "@/constants/theme";

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
  const [lastSync, setLastSync] = useState<Date>(new Date());

  useEffect(() => {
    const syncData = async () => {
      try {
        const [metricsRes, telemetryRes] = await Promise.all([
          fetch("/api/staff/metrics"),
          fetch("/api/telemetry")
        ]);
        
        const metricsData = await metricsRes.json();
        const telemetryData = await telemetryRes.json();

        if (metricsData.metrics) setMetrics(metricsData.metrics);
        if (telemetryData) setTelemetry(telemetryData);
        
        setLastSync(new Date());
      } catch (error) {
        console.error("Failed to sync telemetry:", error);
      }
    };

    syncData();
    const interval = setInterval(syncData, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleGateClick = (gate: string) => {
    setGateFilter(prev => prev === gate ? null : gate);
  };

  return (
    <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
      {/* Cinematic Scan Line */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden rounded-3xl opacity-10">
        <motion.div 
          initial={{ y: "-100%" }}
          animate={{ y: "100%" }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="w-full h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_20px_rgba(16,185,129,0.9)]"
        />
      </div>

      {/* Sidebar: Live Feed (3/12 cols) */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        <motion.section 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/60 rounded-3xl p-6 shadow-2xl flex-1"
        >
          <LiveQueryTicker gateFilter={gateFilter} />
        </motion.section>
      </div>

      {/* Center Stage (6/12 cols) */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/60 rounded-3xl p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <ChartLineUp size={20} weight="duotone" className="text-amber-400" />
              <h2 className="text-[10px] font-black tracking-[0.2em] text-amber-400 uppercase italic">Real-Time Operations</h2>
            </div>
            <div className="text-[9px] font-mono text-zinc-500">
              LAST SYNC: {lastSync.toLocaleTimeString()}
            </div>
          </div>
          <LiveStatusCards data={telemetry} />
        </motion.section>
        
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/60 rounded-3xl p-8 flex-1 shadow-2xl min-h-[450px]"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <Database size={20} weight="duotone" className="text-amber-400" />
              <h2 className="text-[10px] font-black tracking-[0.2em] text-amber-400 uppercase italic">Spatial Intelligence</h2>
            </div>
            {gateFilter && (
              <button 
                onClick={() => setGateFilter(null)}
                className="text-[9px] font-black text-amber-500 border border-amber-500/20 px-2 py-1 rounded bg-amber-500/5 hover:bg-amber-500/10"
              >
                RESET FILTER: {gateFilter}
              </button>
            )}
          </div>
          
          <div className="relative aspect-square w-full max-w-lg mx-auto">
            {/* Stadium Visualizer */}
            <svg viewBox="0 0 800 800" className="w-full h-full drop-shadow-2xl">
              {/* Stadium Outer Ring */}
              <circle cx="400" cy="400" r="380" className="fill-zinc-950 stroke-zinc-800 stroke-2" />
              
              {/* Region A (Top Left) */}
              <path 
                onClick={() => handleGateClick('Gate A')}
                d="M400,400 L50,400 A350,350 0 0,1 400,50 Z" 
                className={`${STATUS_CLASSES[metrics.gateA]} transition-all duration-500 stroke-2 cursor-pointer hover:opacity-80 ${gateFilter === 'Gate A' ? 'stroke-white stroke-[3px]' : ''}`}
              />
              {/* Region B (Top Right) */}
              <path 
                onClick={() => handleGateClick('Gate B')}
                d="M400,400 L400,50 A350,350 0 0,1 750,400 Z" 
                className={`${STATUS_CLASSES[metrics.gateB]} transition-all duration-500 stroke-2 cursor-pointer hover:opacity-80 ${gateFilter === 'Gate B' ? 'stroke-white stroke-[3px]' : ''}`}
              />
              {/* Region C (Bottom Right) */}
              <path 
                onClick={() => handleGateClick('Gate C')}
                d="M400,400 L750,400 A350,350 0 0,1 400,750 Z" 
                className={`${STATUS_CLASSES[metrics.gateC]} transition-all duration-500 stroke-2 cursor-pointer hover:opacity-80 ${gateFilter === 'Gate C' ? 'stroke-white stroke-[3px]' : ''}`}
              />
              {/* Region D (Bottom Left) */}
              <path 
                onClick={() => handleGateClick('Gate D')}
                d="M400,400 L400,750 A350,350 0 0,1 50,400 Z" 
                className={`${STATUS_CLASSES[metrics.gateD]} transition-all duration-500 stroke-2 cursor-pointer hover:opacity-80 ${gateFilter === 'Gate D' ? 'stroke-white stroke-[3px]' : ''}`}
              />

              {/* Pitch */}
              <rect x="340" y="350" width="120" height="100" rx="10" className="fill-emerald-950 stroke-emerald-500/30 stroke-2" />
              
              {/* Region Labels */}
              <text x="250" y="250" className="fill-white text-[14px] font-black tracking-widest italic pointer-events-none" textAnchor="middle">GATE A</text>
              <text x="550" y="250" className="fill-white text-[14px] font-black tracking-widest italic pointer-events-none" textAnchor="middle">GATE B</text>
              <text x="550" y="550" className="fill-white text-[14px] font-black tracking-widest italic pointer-events-none" textAnchor="middle">GATE C</text>
              <text x="250" y="550" className="fill-white text-[14px] font-black tracking-widest italic pointer-events-none" textAnchor="middle">GATE D</text>
            </svg>
          </div>
        </motion.section>
      </div>

      {/* Right Sidebar: Intelligence (3/12 cols) */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        <motion.section 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/60 rounded-3xl p-6 shadow-2xl h-fit"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <h2 className="text-[10px] font-black tracking-[0.2em] text-amber-400 uppercase italic">Tactical Insights</h2>
          </div>
          <OperationalInsights />
        </motion.section>
      </div>
    </div>
  );
}
