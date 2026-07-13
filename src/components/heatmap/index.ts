import { GateMetrics } from "@/types/telemetry";

export type HeatmapVariant = "stadium-svg" | "thermal-grid" | "stadium-map";

export interface HeatmapBaseProps {
  metrics: GateMetrics;
  gateFilter: string | null;
  onGateClick: (gate: string) => void;
}

export const GATE_POSITIONS = {
  gateA: { label: "Gate A", position: "top-left" as const },
  gateB: { label: "Gate B", position: "top-right" as const },
  gateC: { label: "Gate C", position: "bottom-left" as const },
  gateD: { label: "Gate D", position: "bottom-right" as const },
} as const;

export const STATUS_COLORS = {
  low: { fill: "#10b981", glow: "rgba(16, 185, 129, 0.4)", pulse: "#34d399" },
  medium: { fill: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)", pulse: "#fbbf24" },
  high: { fill: "#ef4444", glow: "rgba(239, 68, 68, 0.4)", pulse: "#f87171" },
} as const;
