"use client";

import { motion } from "motion/react";
import { HeatmapBaseProps, STATUS_COLORS } from "./index";

const GATES = [
  { key: "gateA", label: "Gate A", x: 100, y: 40, angle: 0 },
  { key: "gateB", label: "Gate B", x: 300, y: 40, angle: 90 },
  { key: "gateC", label: "Gate C", x: 100, y: 360, angle: 270 },
  { key: "gateD", label: "Gate D", x: 300, y: 360, angle: 180 },
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
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={`url(#${id})`} strokeWidth="40" strokeLinecap="round" />
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

        {/* Stadium outline — rounded rectangle */}
        <rect x="30" y="30" width="340" height="340" rx="60"
          fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

        {/* Heat gradient connections between gates */}
        {GATES.map((g, i) => {
          const next = GATES[(i + 1) % GATES.length];
          const s1 = metrics[g.key as keyof typeof metrics];
          const s2 = metrics[next.key as keyof typeof metrics];
          return (
            <HeatGradient
              key={`heat-${i}`}
              x1={g.x} y1={g.y} x2={next.x} y2={next.y}
              color1={STATUS_COLORS[s1].fill}
              color2={STATUS_COLORS[s2].fill}
            />
          );
        })}

        {/* Diagonal heat lines */}
        <HeatGradient
          x1={GATES[0].x} y1={GATES[0].y} x2={GATES[3].x} y2={GATES[3].y}
          color1={STATUS_COLORS[metrics.gateA].fill} color2={STATUS_COLORS[metrics.gateD].fill}
        />
        <HeatGradient
          x1={GATES[1].x} y1={GATES[1].y} x2={GATES[2].x} y2={GATES[2].y}
          color1={STATUS_COLORS[metrics.gateB].fill} color2={STATUS_COLORS[metrics.gateC].fill}
        />

        {/* Center field */}
        <circle cx={centerX} cy={centerY} r="50"
          fill="url(#fieldGlow)" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1" />
        <text x={centerX} y={centerY - 4} textAnchor="middle" className="fill-zinc-500 text-[9px] font-black tracking-[0.15em] uppercase">
          Field
        </text>
        <text x={centerX} y={centerY + 10} textAnchor="middle" className="fill-zinc-600 text-[7px]">
          CENTER
        </text>

        {/* Animated particles along heat lines */}
        {GATES.map((g, i) => {
          const s = metrics[g.key as keyof typeof metrics];
          if (s === "low") return null;
          const next = GATES[(i + 1) % GATES.length];
          return (
            <motion.circle
              key={`particle-${i}`}
              r={s === "high" ? 3 : 2}
              fill={STATUS_COLORS[s].fill}
              opacity={0.7}
              animate={{
                cx: [g.x, (g.x + next.x) / 2, next.x],
                cy: [g.y, (g.y + next.y) / 2, next.y],
              }}
              transition={{
                duration: s === "high" ? 2 : 4,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          );
        })}

        {/* Gate nodes */}
        {GATES.map(({ key, label, x, y }) => {
          const status = metrics[key as keyof typeof metrics];
          const color = STATUS_COLORS[status];
          const isActive = gateFilter === key;

          return (
            <g key={key} onClick={() => onGateClick(key)} className="cursor-pointer">
              {/* Outer glow */}
              <motion.circle
                cx={x} cy={y} r={isActive ? 34 : 28}
                fill={color.glow}
                animate={
                  status === "high"
                    ? { opacity: [0.3, 0.7, 0.3], r: [28, 34, 28] }
                    : status === "medium"
                    ? { opacity: [0.2, 0.4, 0.2] }
                    : { opacity: 0.15 }
                }
                transition={{ duration: status === "high" ? 1.2 : 2.5, repeat: Infinity }}
              />

              {/* Gate circle */}
              <motion.circle
                cx={x} cy={y} r={22}
                fill="rgba(0,0,0,0.7)"
                stroke={color.fill}
                strokeWidth={isActive ? 3 : 1.5}
                whileHover={{ scale: 1.15 }}
              />

              {/* Status indicator */}
              <motion.circle
                cx={x} cy={y - 5} r={3}
                fill={color.fill}
                animate={status === "high" ? { scale: [1, 1.5, 1] } : {}}
                transition={{ duration: 0.8, repeat: Infinity }}
              />

              {/* Label */}
              <text x={x} y={y + 6} textAnchor="middle" className="fill-white text-[9px] font-black tracking-wider">
                {label.replace("Gate ", "G")}
              </text>
              <text x={x} y={y + 15} textAnchor="middle" fill={color.fill} className="text-[7px] font-bold">
                {status === "high" ? "CRIT" : status === "medium" ? "WARN" : "OK"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
