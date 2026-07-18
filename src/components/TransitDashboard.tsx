"use client";

import { useState, useEffect } from "react";
import { LiveStatusCards } from "./LiveStatusCards";
import { AICopilotChat } from "./AICopilotChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TransitDashboard() {
  const [data, setData] = useState<{
    nearestGate: { label: string; status: "open" | "congested" };
    nearestHub: { label: string; waitTime: number };
    weatherAdvisory: { label: string; condition: "clear" | "rain" };
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/telemetry")
      .then((r) => r.json())
      .then((d) => {
        if (mounted) {
          // Only set data if we actually have telemetry
          if (d && d.nearestGate && d.nearestHub && d.weatherAdvisory) {
            setData(d);
          }
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex items-center justify-center h-64">
        <p className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase italic">Loading telemetry...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex items-center justify-center h-64">
        <p className="text-[10px] font-black tracking-[0.2em] text-amber-500/70 uppercase italic">No telemetry data available — check API configuration</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Telemetry Module */}
      <Card>
        <CardHeader>
          <CardTitle className="text-amber-400 uppercase tracking-wider text-sm">
            Real-Time Telemetry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LiveStatusCards data={data} />
        </CardContent>
      </Card>

      {/* Copilot Module */}
      <Card className="overflow-hidden flex flex-col">
        <CardHeader>
          <CardTitle className="text-amber-400 uppercase tracking-wider text-sm">
            Matchday Mate
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <AICopilotChat />
        </CardContent>
      </Card>
    </div>
  );
}
