"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { AICopilotChat } from "./AICopilotChat";
import { LiveQueryTicker } from "./LiveQueryTicker";
import { LiveStatusCards } from "./LiveStatusCards";

export default function FanHub() {
  const [telemetry, setTelemetry] = useState({
    nearestGate: { label: "SCANNING...", status: "open" as const },
    nearestHub: { label: "SCANNING...", waitTime: 0 },
    weatherAdvisory: { label: "SCANNING...", condition: "clear" as const },
  });

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch("/api/telemetry");
        const data = await res.json();
        if (data) setTelemetry(data);
      } catch (error) {
        console.error("Failed to fetch fan telemetry:", error);
      }
    };
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 w-full flex flex-col gap-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/60 rounded-3xl p-6 shadow-2xl"
      >
        <div className="mb-6">
          <h2 className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase italic mb-4">Your Matchday Status</h2>
          <LiveStatusCards data={telemetry} />
        </div>
        <LiveQueryTicker />
      </motion.div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/60 rounded-3xl overflow-hidden min-h-[600px] flex flex-col shadow-2xl"
      >
        <div className="p-5 border-b border-zinc-800/60 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase italic">Fan Support Assistant</h2>
          </div>
          <span className="text-[10px] font-bold text-zinc-600 font-mono">ENCRYPTED ENDPOINT: LIS-808</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <AICopilotChat />
        </div>
      </motion.div>
    </div>
  );
}
