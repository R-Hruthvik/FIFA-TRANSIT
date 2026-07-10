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
    <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Telemetry Module */}
      <section className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/60 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] p-6">
        <h2 className="text-amber-400 font-bold mb-6 tracking-wider uppercase text-sm">Real-Time Telemetry</h2>
        <LiveStatusCards data={data} />
      </section>

      {/* Copilot Module */}
      <section className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/60 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] overflow-hidden flex flex-col">
        <h2 className="text-amber-400 font-bold p-6 pb-0 tracking-wider uppercase text-sm">Tournament Co-Pilot</h2>
        <div className="flex-1">
          <AICopilotChat stadiumState={data} />
        </div>
      </section>
    </div>
  );
}
