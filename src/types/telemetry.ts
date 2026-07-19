export type GateStatus = 'low' | 'medium' | 'high';

export interface GateMetrics {
  gate1: GateStatus;
  gate2: GateStatus;
  gate3: GateStatus;
  gate4: GateStatus;
  gate5: GateStatus;
  gate6: GateStatus;
  gate7: GateStatus;
  gate8: GateStatus;
}

export interface StadiumTelemetry {
  timestamp?: number;
  nearestGate: { label: string; status: 'open' | 'busy' | 'congested' };
  nearestHub: { label: string; waitTime: number };
  weatherAdvisory: { label: string; condition: 'clear' | 'rain' };
  // Extended fields for live demo simulation
  gateMetrics?: GateMetrics;
  crowdCount?: number;
  gateEvents?: Array<{
    timestamp: number;
    gate: string;
    type: 'entry' | 'exit' | 'alert';
    crowdCount?: number;
    message: string;
  }>;
  matchState?: {
    minute: number;
    half: 1 | 2;
    homeScore: number;
    awayScore: number;
    phase: 'pre-match' | 'first-half' | 'half-time' | 'second-half' | 'full-time';
  };
  adminLogs?: Array<{
    timestamp: number;
    level: 'info' | 'warning' | 'alert';
    category: 'crowd' | 'gate' | 'system';
    message: string;
  }>;
}

export type AppTab = 'fan' | 'staff';
