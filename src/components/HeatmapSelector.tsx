"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Gear, MapPin, GridFour, Buildings } from "@phosphor-icons/react";
import { HeatmapVariant } from "./heatmap";

const STORAGE_KEY = "fifa-heatmap-variant";

const VARIANTS: { key: HeatmapVariant; label: string; description: string; icon: React.ReactNode }[] = [
  {
    key: "stadium-svg",
    label: "Stadium Layout",
    description: "SVG top-down stadium with gates around the perimeter",
    icon: <Buildings size={18} weight="duotone" />,
  },
  {
    key: "thermal-grid",
    label: "Thermal Grid",
    description: "4-gate grid with thermal overlay and intensity bars",
    icon: <GridFour size={18} weight="duotone" />,
  },
  {
    key: "stadium-map",
    label: "Stadium Map",
    description: "Geometric map with heat gradients and particle flow",
    icon: <MapPin size={18} weight="duotone" />,
  },
];

function getStoredVariant(): HeatmapVariant {
  if (typeof window === "undefined") return "stadium-svg";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VARIANTS.some((v) => v.key === stored)) return stored as HeatmapVariant;
  } catch {}
  return "stadium-svg";
}

interface HeatmapSelectorProps {
  current: HeatmapVariant;
  onChange: (variant: HeatmapVariant) => void;
}

export function HeatmapSelector({ current, onChange }: HeatmapSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (variant: HeatmapVariant) => {
    onChange(variant);
    try { localStorage.setItem(STORAGE_KEY, variant); } catch {}
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select heatmap view"
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-800 hover:border-emerald-500/50 bg-zinc-900/40 text-zinc-400 hover:text-white transition-all text-[10px] font-black tracking-widest uppercase"
      >
        <Gear size={14} weight="duotone" className={isOpen ? "animate-spin" : ""} />
        <span className="hidden sm:inline">Heatmap</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 w-72 p-2 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl shadow-black/50"
            >
              <p className="px-3 py-2 text-[9px] font-black tracking-[0.2em] text-zinc-400 uppercase">
                Select Heatmap View
              </p>
              {VARIANTS.map((v) => (
                <button
                  key={v.key}
                  onClick={() => handleSelect(v.key)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                    current === v.key
                      ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                      : "hover:bg-zinc-800/60 text-zinc-400 hover:text-white border border-transparent"
                  }`}
                >
                  <div className="flex-shrink-0">{v.icon}</div>
                  <div>
                    <p className="text-xs font-bold">{v.label}</p>
                    <p className="text-[10px] text-zinc-400">{v.description}</p>
                  </div>
                  {current === v.key && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500" />
                  )}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export { getStoredVariant, STORAGE_KEY };
