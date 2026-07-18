"use client";

import { useDemoMode } from "../DemoController";
import { GATE_POSITIONS } from "./index";

interface CrowdPositionsOverlayProps {
  show: boolean;
  className?: string;
}

export function CrowdPositionsOverlay({ show, className = "" }: CrowdPositionsOverlayProps) {
  const demo = useDemoMode();

  if (!show || !demo?.isDemoMode) return null;

  const positions = demo.getCrowdPositions?.() ?? [];
  if (positions.length === 0) return null;

  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <svg viewBox="0 0 400 400" className="w-full h-full">
        {positions.map((pos, i) => (
          <circle
            key={`crowd-${i}`}
            cx={pos.x}
            cy={pos.y}
            r={1.5}
            fill={pos.isExiting ? "#fbbf24" : "#34d399"}
            opacity={0.6}
          />
        ))}
      </svg>
    </div>
  );
}
