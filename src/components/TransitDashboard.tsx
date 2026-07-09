"use client";

import { useState } from "react";
import { LiveStatusCards } from "./LiveStatusCards";
import { AICopilotChat } from "./AICopilotChat";

export interface GateInfo {
  label: string;
  status: "open" | "congested";
}

export interface HubInfo {
  label: string;
  waitTime: number;
}

export interface WeatherInfo {
  label: string;
  condition: "clear" | "rain";
}

export interface MockTransitData {
  nearestGate: GateInfo;
  nearestHub: HubInfo;
  weatherAdvisory: WeatherInfo;
}

const mockData: MockTransitData = {
  nearestGate: { label: "Gate A", status: "open" },
  nearestHub: { label: "Main Hub", waitTime: 8 },
  weatherAdvisory: { label: "Current", condition: "clear" },
};

export function TransitDashboard() {
  const [data] = useState<MockTransitData>(mockData);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-zinc-800">
        <h1 className="text-xl font-bold tracking-tight">Stadium Egress Co-Pilot</h1>
      </header>

      <main className="flex-1 flex flex-col overflow-hidden">
        <LiveStatusCards data={data} />
        <AICopilotChat stadiumState={data} />
      </main>
    </div>
  );
}