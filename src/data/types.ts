import type { GateMetrics, StadiumTelemetry } from "@/types/telemetry";
import type { Match } from "@/lib/match-api";

export interface CrowdPosition {
  id: string;
  gate: string;
  x: number;
  y: number;
  timestamp: number;
  isExiting: boolean;
}

export interface GateEvent {
  timestamp: number;
  gate: string;
  type: "entry" | "exit" | "alert";
  crowdCount?: number;
  message: string;
}

export interface AdminLogEntry {
  timestamp: number;
  level: "info" | "warning" | "alert";
  category: "crowd" | "gate" | "system";
  message: string;
  data?: Record<string, any>;
}

export interface IDataProvider {
  readonly isDemo: boolean;
  readonly elapsedMs: number;

  getMatch(): {
    match: Match | null;
    upcoming: Match[];
  };

  getTelemetry(): StadiumTelemetry | null;
  getMetrics(): GateMetrics | null;

  getCrowdPositions(): CrowdPosition[];
  getCrowdCount(): number;

  getGateEvents(): GateEvent[];
  getRecentGateEvents(minutesAge: number): GateEvent[];
  getAdminLogs(): AdminLogEntry[];
  getRecentAdminLogs(count: number): AdminLogEntry[];

  getAiResponse(input: string, context?: Record<string, any>): string;
  getFanQuery(): string | null;

  applyGateOverride(gate: string, status: "OPEN" | "CLOSED" | "LIMITED"): void;
  applyStewardDispatch(location: string, count: number): void;
  applyIncidentReport(description: string, severity: string, location: string): void;

  loadScenario?(scenario: {
    title?: string;
    snapshots: Array<{
      t: number;
      gateDensities: Record<string, number>;
      alerts?: string[];
      fanQueries?: string[];
      thermal?: { hotspotGate: string; intensity: number };
    }>;
    broadcastMessage?: string;
  }): void;

  start(): void;
  stop(): void;
}
