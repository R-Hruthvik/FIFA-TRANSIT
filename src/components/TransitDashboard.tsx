"use client";

import { useState } from "react";
import { LiveStatusCards } from "./LiveStatusCards";
import { AICopilotChat } from "./AICopilotChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
            Tournament Co-Pilot
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <AICopilotChat />
        </CardContent>
      </Card>
    </div>
  );
}
