export type GateStatus = 'low' | 'medium' | 'high';

export interface GateMetrics {
  gateA: GateStatus;
  gateB: GateStatus;
  gateC: GateStatus;
  gateD: GateStatus;
}

export interface StadiumTelemetry {
  nearestGate: { label: string; status: 'open' | 'congested' };
  nearestHub: { label: string; waitTime: number };
  weatherAdvisory: { label: string; condition: 'clear' | 'rain' };
}

export type AppTab = 'fan' | 'staff';
