"use client";

import { motion } from "motion/react";
import { HeatmapBaseProps, STATUS_COLORS } from "./index";

const GATES = [
  { key: "gate1", label: "Gate G1", cx: 200, cy: 35 },
  { key: "gate2", label: "Gate G2", cx: 345, cy: 80 },
  { key: "gate3", label: "Gate G3", cx: 370, cy: 200 },
  { key: "gate4", label: "Gate G4", cx: 345, cy: 320 },
  { key: "gate5", label: "Gate G5", cx: 200, cy: 365 },
  { key: "gate6", label: "Gate G6", cx: 55, cy: 320 },
  { key: "gate7", label: "Gate G7", cx: 30, cy: 200 },
  { key: "gate8", label: "Gate G8", cx: 55, cy: 80 },
] as const;

export function StadiumSVG({ metrics, gateFilter, onGateClick, clusters }: HeatmapBaseProps) {
  // Stadium-center-relative meters → 400x400 svg (center 200,200, ~165px radius).
  const SCALE = 165 / 200;
  const toSvg = (x: number, y: number) => ({ sx: 200 + x * SCALE, sy: 200 - y * SCALE });

  return (
    <div className="relative w-full max-w-lg mx-auto">
      <svg viewBox="0 0 400 400" className="w-full">
        {/* Stadium outline — Oval perimeter */}
        <ellipse
          cx="200" cy="200" rx="180" ry="175"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="2"
          strokeDasharray="8 4"
        />

        {/* Inner field — Inner Oval */}
        <ellipse
          cx="200" cy="200" rx="100" ry="70"
          fill="rgba(16, 185, 129, 0.05)"
          stroke="rgba(16, 185, 129, 0.15)"
          strokeWidth="1"
        />
        <text x="200" y="196" textAnchor="middle" className="fill-zinc-400 text-[10px] font-black tracking-[0.2em] uppercase">
          Field of Play
        </text>
        <text x="200" y="212" textAnchor="middle" className="fill-zinc-500 text-[8px] font-medium">
          2026 FIFA World Cup
        </text>

        {/* Connecting lines from gates to field */}
        {GATES.map(({ key, cx, cy }) => {
          const status = metrics[key as keyof typeof metrics] || "low";
          const color = STATUS_COLORS[status];
          return (
            <line
              key={`${key}-line`}
              x1={cx} y1={cy} x2={200} y2="200"
              stroke={color.fill}
              strokeWidth="1"
              strokeOpacity={0.15}
            />
          );
        })}

        {/* Gate nodes */}
        {GATES.map(({ key, label, cx, cy }) => {
          const status = metrics[key as keyof typeof metrics] || "low";
          const color = STATUS_COLORS[status];
          const isActive = gateFilter === key;

          return (
            <g
              key={key}
              onClick={() => onGateClick(key)}
              className="cursor-pointer"
            >
              {/* Glow — animate opacity only (r can't be animated by Framer Motion) */}
              <motion.circle
                cx={cx} cy={cy} r={isActive ? 32 : 26}
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

              {/* Gate circle */}
              <circle
                cx={cx} cy={cy} r={20}
                fill="rgba(0,0,0,0.7)"
                stroke={color.fill}
                strokeWidth={isActive ? 2.5 : 1.5}
              />

              {/* Gate label */}
              <text
                x={cx} y={cy + 1}
                textAnchor="middle"
                className="fill-white text-[8px] font-black uppercase"
              >
                {key.slice(-1)}
              </text>

              {/* Status indicator */}
              <circle cx={cx} cy={cy - 5} r={2.5} fill={color.fill} />

              {/* Label */}
              <text
                x={cx} y={cy + 36}
                textAnchor="middle"
                className="fill-zinc-400 text-[7px] font-medium uppercase tracking-wider"
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Co-location clusters (nearby-crowd blobs) */}
        {(clusters ?? []).map((c) => {
          const { sx, sy } = toSvg(c.centroidX, c.centroidY);
          const r = Math.min(60, 12 + c.size * 2.2);
          const lowConf = c.confidence < 0.35;
          const fill = c.size >= 20 ? "#ef4444" : c.size >= 8 ? "#f59e0b" : "#10b981";
          return (
            <g key={c.id} opacity={lowConf ? 0.4 : 0.85}>
              <motion.circle
                cx={sx}
                cy={sy}
                r={r}
                fill={fill}
                fillOpacity={0.18}
                stroke={fill}
                strokeOpacity={0.5}
                strokeWidth={1}
                animate={{ opacity: [0.5, 0.85, 0.5] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
              <text
                x={sx}
                y={sy + 3}
                textAnchor="middle"
                className="fill-white text-[8px] font-black"
              >
                {c.size}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
