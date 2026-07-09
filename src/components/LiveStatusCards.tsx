"use client";

import { MockTransitData } from "./TransitDashboard";

interface LiveStatusCardsProps {
  data: MockTransitData;
}

export function LiveStatusCards({ data }: LiveStatusCardsProps) {
  const { nearestGate, nearestHub, weatherAdvisory } = data;

  const getStatusColor = (status: "open" | "congested") =>
    status === "open"
      ? "bg-green-500/20 border-green-500/50 text-green-400"
      : "bg-amber-500/20 border-amber-500/50 text-amber-400";

  const getWeatherColor = (condition: "clear" | "rain") =>
    condition === "clear"
      ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
      : "bg-sky-500/20 border-sky-500/50 text-sky-400";

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <h2 className="text-sm font-medium text-zinc-400 mb-3 uppercase tracking-wider">
        Live Status
      </h2>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
        {/* Card 1: Nearest Gate */}
        <div className="flex-shrink-0 w-[200px] snap-start p-4 rounded-xl border-2 bg-zinc-900 border-zinc-700">
          <div className="text-xs text-zinc-400 uppercase tracking-wider mb-2">
            Nearest Gate
          </div>
          <div className="font-semibold text-base mb-2">{nearestGate.label}</div>
          <div
            className={`text-xs capitalize inline-block px-2 py-1 rounded-full ${getStatusColor(nearestGate.status)}`}
          >
            {nearestGate.status}
          </div>
        </div>

        {/* Card 2: Transit Hub */}
        <div className="flex-shrink-0 w-[200px] snap-start p-4 rounded-xl border-2 bg-zinc-900 border-zinc-700">
          <div className="text-xs text-zinc-400 uppercase tracking-wider mb-2">
            Transit Hub
          </div>
          <div className="font-semibold text-base mb-2">{nearestHub.label}</div>
          <div className="text-2xl font-bold text-cyan-400">{nearestHub.waitTime} min</div>
        </div>

        {/* Card 3: Weather / Advisory */}
        <div className="flex-shrink-0 w-[200px] snap-start p-4 rounded-xl border-2 bg-zinc-900 border-zinc-700">
          <div className="text-xs text-zinc-400 uppercase tracking-wider mb-2">
            Weather / Advisory
          </div>
          <div className="font-semibold text-base mb-2">{weatherAdvisory.label}</div>
          <div
            className={`text-xs capitalize inline-block px-2 py-1 rounded-full ${getWeatherColor(weatherAdvisory.condition)}`}
          >
            {weatherAdvisory.condition === "clear" ? "☀️ Clear" : "🌧️ Rain"}
          </div>
        </div>
      </div>
    </div>
  );
}