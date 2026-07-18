"use client";

import { motion } from "motion/react";
import { HeatmapBaseProps, STATUS_COLORS } from "./index";

const GATES = [
  { key: "gate1", label: "Gate G1", x: 200, y: 35 },
  { key: "gate2", label: "Gate G2", x: 345, y: 80 },
  { key: "gate3", label: "Gate G3", x: 370, y: 200 },
  { key: "gate4", label: "Gate G4", x: 345, y: 320 },
  { key: "gate5", label: "Gate G5", x: 200, y: 365 },
  { key: "gate6", label: "Gate G6", x: 55, y: 320 },
  { key: "gate7", label: "Gate G7", x: 30, y: 200 },
  { key: "gate8", label: "Gate G8", x: 55, y: 80 },
] as const;

function HeatGradient({ x1, y1, x2, y2, color1, color2 }: {
  x1: number; y1: number; x2: number; y2: number;
  color1: string; color2: string;
}) {
  const id = `grad-${x1}-${y1}-${x2}-${y2}`;
  return (
    <>
      <defs>
        <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color1} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color2} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={`url(#${id})`} strokeWidth="30" strokeLinecap="round" />
    </>
  );
}

export function StadiumMap({ metrics, gateFilter, onGateClick }: HeatmapBaseProps) {
  const centerX = 200;
  const centerY = 200;

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <svg viewBox="0 0 400 400" className="w-full">
        <defs>
          <radialGradient id="fieldGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(16, 185, 129, 0.08)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Stadium outline */}
        <ellipse
          cx={centerX} cy={centerY} rx="180" ry="175"
          fill="url(#fieldGlow)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="2"
          strokeDasharray="8 4"
        />

        {/* Inner field */}
        <ellipse
          cx={centerX} cy={centerY} rx="100" ry="70"
          fill="rgba(16, 185, 129, 0.05)"
          stroke="rgba(16, 185, 129, 0.15)"
          strokeWidth="1"
        />
        <text x={centerX} y={centerY - 5} textAnchor="middle" className="fill-zinc-400 text-[10px] font-black tracking-[0.2em] uppercase">
          Field of Play
        </text>
        <text x={centerX} y={centerY + 12} textAnchor="middle" className="fill-zinc-500 text-[8px] font-medium">
          2026 FIFA World Cup
        </text>

        {/* Heat gradient lines */}
        {GATES.map(({ key, x, y }) => {
          const status = metrics[key as keyof typeof metrics] || "low";
          const color = STATUS_COLORS[status];
          return (
            <HeatGradient
              key={`grad-${key}`}
              x1={centerX} y1={centerY}
              x2={x} y2={y}
              color1={color.fill}
              color2="transparent"
            />
          );
        })}

        {/* Gate nodes */}
        {GATES.map(({ key, label, x, y }) => {
          const status = metrics[key as keyof typeof metrics] || "low";
          const color = STATUS_COLORS[status];
          const isActive = gateFilter === key;

          return (
            <g
              key={key}
              onClick={() => onGateClick(key)}
              className="cursor-pointer"
            >
              <motion.circle
                cx={x} cy={y} r={isActive ? 32 : 26}
                fill={color.glow}
                animate={{
                  opacity: status === "high" ? [0.3, 0.5, 0.3] : 0.2,
                }}
                transition={{
                  duration: status === "high" ? 1.5 : 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              <circle cx={x} cy={y} r={20} fill="rgba(0,0,0,0.7)" stroke={color.fill} strokeWidth={isActive ? 2.5 : 1.5} />

              <text x={x} y={y + 1} textAnchor="middle" className="fill-white text-[8px] font-black uppercase">
                {key.slice(-1)}
              </text>

              <circle cx={x} cy={y - 5} r={2.5} fill={color.fill} />

              <text x={x} y={y + 36} textAnchor="middle" className="fill-zinc-400 text-[7px] font-medium uppercase tracking-wider">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
