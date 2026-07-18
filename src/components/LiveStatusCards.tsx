"use client";

import { motion } from "motion/react";
import { DoorOpen, Bus, CloudSun, ClockClockwise } from "@phosphor-icons/react";
import { StadiumTelemetry } from "@/types/telemetry";
import { COLOR_MAP } from "@/constants/theme";

interface LiveStatusCardsProps {
  data: StadiumTelemetry;
}

export function LiveStatusCards({ data }: LiveStatusCardsProps) {
  const { nearestGate, nearestHub, weatherAdvisory } = data;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Nearest Gate */}
      <Card
        label="PRIMARY ENTRY"
        title={nearestGate.label}
        value={nearestGate.status.toUpperCase()}
        status={nearestGate.status === "open" ? "success" : "warning"}
        icon={<DoorOpen size={24} weight="duotone" />}
      />

      {/* Transit Hub */}
      <Card
        label="TRANSIT NETWORK"
        title={nearestHub.label}
        value={`${nearestHub.waitTime} MIN`}
        status="info"
        icon={<Bus size={24} weight="duotone" />}
        footer={
          nearestHub.waitTime > 0 ? (
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-medium">
              <ClockClockwise size={12} />
              WAIT TIME
            </div>
          ) : undefined
        }
      />

      {/* Weather */}
      <Card
        label="ENVIRONMENT"
        title={weatherAdvisory.label}
        value={weatherAdvisory.condition === "clear" ? "OPTIMAL" : "ADVISORY"}
        status={weatherAdvisory.condition === "clear" ? "success" : "warning"}
        icon={<CloudSun size={24} weight="duotone" />}
      />
    </div>
  );
}

interface CardProps {
  label: string;
  title: string;
  value: string;
  status: keyof typeof COLOR_MAP;
  icon: React.ReactNode;
  footer?: React.ReactNode;
}

function Card({ label, title, value, status, icon, footer }: CardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className="group relative p-5 rounded-2xl bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 shadow-lg overflow-hidden"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase mb-1">{label}</p>
          <h3 className="text-lg font-bold text-white tracking-tight">{title}</h3>
        </div>
        <div className={`p-2.5 rounded-xl border ${COLOR_MAP[status]} transition-colors group-hover:border-white/20`}>
          {icon}
        </div>
      </div>

      <div className="flex items-end justify-between gap-2">
        <p className={`text-2xl font-black tracking-tighter ${COLOR_MAP[status].split(' ')[0]}`}>
          {value}
        </p>
        {footer}
      </div>

      {/* Subtle Shimmer Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
    </motion.div>
  );
}
