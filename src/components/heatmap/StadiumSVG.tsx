"use client";

import { motion } from "motion/react";
import { HeatmapBaseProps, STATUS_COLORS } from "./index";

const GATES = [
  { key: "gateA", label: "Gate A", cx: 80, cy: 80 },
  { key: "gateB", label: "Gate B", cx: 320, cy: 80 },
  { key: "gateC", label: "Gate C", cx: 80, cy: 320 },
  { key: "gateD", label: "Gate D", cx: 320, cy: 320 },
] as const;

export function StadiumSVG({ metrics, gateFilter, onGateClick }: HeatmapBaseProps) {
  return (
    <div className="relative w-full max-w-lg mx-auto">
      <svg viewBox="0 0 400 400" className="w-full">
        {/* Stadium outline */}
        <rect
          x="20" y="20" width="360" height="360" rx="40"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="2"
          strokeDasharray="8 4"
        />

        {/* Inner field */}
        <rect
          x="100" y="100" width="200" height="200" rx="16"
          fill="rgba(16, 185, 129, 0.05)"
          stroke="rgba(16, 185, 129, 0.15)"
          strokeWidth="1"
        />
        <text x="200" y="196" textAnchor="middle" className="fill-zinc-600 text-[10px] font-black tracking-[0.2em] uppercase">
          Field of Play
        </text>
        <text x="200" y="212" textAnchor="middle" className="fill-zinc-700 text-[8px] font-medium">
          2026 FIFA World Cup
        </text>

        {/* Connecting lines from gates to field */}
        {GATES.map(({ key, cx, cy }) => {
          const status = metrics[key as keyof typeof metrics];
          const color = STATUS_COLORS[status];
          return (
            <line
              key={`${key}-line`}
              x1={cx} y1={cy}
              x2={200} y2={200}
              stroke={color.fill}
              strokeWidth="1"
              strokeOpacity="0.15"
              strokeDasharray="4 4"
            />
          );
        })}

        {/* Gate nodes */}
        {GATES.map(({ key, label, cx, cy }) => {
          const status = metrics[key as keyof typeof metrics];
          const color = STATUS_COLORS[status];
          const isActive = gateFilter === key;

          return (
            <g
              key={key}
              onClick={() => onGateClick(key)}
              className="cursor-pointer"
            >
              {/* Glow */}
              <motion.circle
                cx={cx} cy={cy} r={isActive ? 42 : 36}
                fill={color.glow}
                animate={{
                  opacity: status === "high" ? [0.3, 0.6, 0.3] : 0.2,
                  r: isActive ? [42, 46, 42] : [36, 38, 36],
                }}
                transition={{
                  duration: status === "high" ? 1.5 : 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              {/* Gate circle */}
              <motion.circle
                cx={cx} cy={cy} r={30}
                fill="rgba(0,0,0,0.6)"
                stroke={color.fill}
                strokeWidth={isActive ? 3 : 2}
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              />

              {/* Status dot */}
              <motion.circle
                cx={cx} cy={cy - 8} r={4}
                fill={color.fill}
                animate={status === "high" ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              />

              {/* Label */}
              <text x={cx} y={cy + 6} textAnchor="middle" className="fill-white text-[10px] font-black tracking-wider">
                {label}
              </text>

              {/* Status text */}
              <text x={cx} y={cy + 18} textAnchor="middle" className={`text-[8px] font-bold`} fill={color.fill}>
                {status === "high" ? "CRITICAL" : status === "medium" ? "WARNING" : "NORMAL"}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
