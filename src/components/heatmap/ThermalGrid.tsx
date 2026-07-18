"use client";

import { motion } from "motion/react";
import { HeatmapBaseProps, STATUS_COLORS } from "./index";
import { STATUS_CLASSES } from "@/constants/theme";

const GATES = [
  { key: "gate1", label: "Gate G1" },
  { key: "gate2", label: "Gate G2" },
  { key: "gate3", label: "Gate G3" },
  { key: "gate4", label: "Gate G4" },
  { key: "gate5", label: "Gate G5" },
  { key: "gate6", label: "Gate G6" },
  { key: "gate7", label: "Gate G7" },
  { key: "gate8", label: "Gate G8" },
] as const;

export function ThermalGrid({ metrics, gateFilter, onGateClick }: HeatmapBaseProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
      {/* Thermal overlay — radial gradient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
        {GATES.map(({ key }, i) => {
          const status = metrics[key as keyof typeof metrics] || "low";
          const color = STATUS_COLORS[status];
          const row = Math.floor(i / 4);
          const col = i % 4;
          const cellW = 25;
          const cellH = 50;
          return (
            <motion.div
              key={`thermal-${key}`}
              className="absolute rounded-full hidden md:block"
              style={{
                left: `${col * cellW + cellW / 2 - 30}%`,
                top: `${row * cellH + cellH / 2 - 30}%`,
                width: "60%",
                height: "60%",
                background: `radial-gradient(circle, ${color.glow} 0%, transparent 70%)`,
              }}
              animate={
                status === "high"
                  ? { opacity: [0.4, 0.8, 0.4], scale: [1, 1.15, 1] }
                  : status === "medium"
                  ? { opacity: [0.2, 0.5, 0.2], scale: [1, 1.05, 1] }
                  : { opacity: 0.15, scale: 1 }
              }
              transition={{
                duration: status === "high" ? 1.5 : 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          );
        })}
      </div>

      {/* Gate cards */}
      {GATES.map(({ key, label }) => {
        const status = metrics[key as keyof typeof metrics] || "low";
        const isActive = gateFilter === key;

        return (
          <motion.button
            key={key}
            onClick={() => onGateClick(key)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            className={`relative p-4 rounded-xl border transition-all duration-200 text-left z-10 ${
              STATUS_CLASSES[status].bg
            } ${STATUS_CLASSES[status].border} ${
              isActive ? "ring-2 ring-emerald-500 shadow-lg shadow-emerald-500/20" : ""
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">
                {label}
              </span>
              <motion.div
                className={`w-2.5 h-2.5 rounded-full ${STATUS_CLASSES[status].dot}`}
                animate={status === "high" ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: status === "high" ? "90%" : status === "medium" ? "55%" : "20%",
                  }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${STATUS_CLASSES[status].bar}`}
                />
              </div>
              <span className={`text-[11px] font-bold ${STATUS_CLASSES[status].text}`}>
                {status === "high" ? "CRIT" : status === "medium" ? "WARN" : "OK"}
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
