"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { AICopilotChat } from "./AICopilotChat";
import { LiveQueryTicker } from "./LiveQueryTicker";
import { LiveStatusCards } from "./LiveStatusCards";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
      >
        <Card className="p-6">
          <div className="mb-6">
            <h2 className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase italic mb-4">
              Your Matchday Status
            </h2>
            <LiveStatusCards data={telemetry} />
          </div>
          <LiveQueryTicker />
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="min-h-[600px] flex flex-col overflow-hidden p-0">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase italic">
                Fan Support Assistant
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
  );
}
