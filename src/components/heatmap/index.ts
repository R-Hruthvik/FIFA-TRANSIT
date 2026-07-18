import { GateMetrics } from "@/types/telemetry";

export type HeatmapVariant = "stadium-svg" | "thermal-grid" | "stadium-map";

/** Co-location cluster rendered on the stadium heatmap (real pipeline). */
export interface HeatmapCluster {
  id: string;
  size: number;
  centroidX: number; // stadium-center-relative meters
  centroidY: number;
  gateId: string;
  confidence: number;
}

export interface HeatmapBaseProps {
  metrics: GateMetrics;
  gateFilter: string | null;
  onGateClick: (gate: string) => void;
  /** Optional co-location clusters (nearby-crowd blobs). */
  clusters?: HeatmapCluster[];
}

export const GATE_POSITIONS = {
  gate1: { label: "Gate G1", position: "top" as const },
  gate2: { label: "Gate G2", position: "top-right" as const },
  gate3: { label: "Gate G3", position: "right" as const },
  gate4: { label: "Gate G4", position: "bottom-right" as const },
  gate5: { label: "Gate G5", position: "bottom" as const },
  gate6: { label: "Gate G6", position: "bottom-left" as const },
  gate7: { label: "Gate G7", position: "left" as const },
  gate8: { label: "Gate G8", position: "top-left" as const },
} as const;

export const STATUS_COLORS = {
  low: { fill: "#10b981", glow: "rgba(16, 185, 129, 0.4)", pulse: "#34d399" },
  medium: { fill: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)", pulse: "#fbbf24" },
  high: { fill: "#ef4444", glow: "rgba(239, 68, 68, 0.4)", pulse: "#f87171" },
} as const;
