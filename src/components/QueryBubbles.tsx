"use client";

import { MapPin, Clock, Bus, Warning, Users, CloudSun } from "@phosphor-icons/react";
import type { IconProps } from "@phosphor-icons/react";

const SUGGESTIONS: Record<string, string[]> = {
  scheduled: [
    "Find section entry gate",
    "Check transit hub wait times",
    "Opt-in to crowd tracking",
  ],
  live: [
    "Give me a match status brief",
    "Fastest path to snacks at halftime",
    "Current gate congestion",
  ],
  finished: [
    "Let's beat traffic: show my exit path",
    "Are shuttles experiencing delays?",
    "Report exit blockage",
  ],
};

interface QuickAction {
  icon: React.ComponentType<IconProps>;
  label: string;
  query: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { icon: MapPin, label: "Find gate", query: "Which gate should I use?" },
  { icon: Clock, label: "Wait times", query: "Check transit hub wait times" },
  { icon: Bus, label: "Exit path", query: "Show my exit path" },
  { icon: Warning, label: "Report issue", query: "I need to report an issue" },
  { icon: Users, label: "Crowd status", query: "What's the current crowd density?" },
  { icon: CloudSun, label: "Weather", query: "What's the weather at the stadium?" },
];

export function QueryBubbles({
  matchStatus,
  onSelectBubble,
  variant = "default",
}: {
  matchStatus?: string;
  onSelectBubble: (query: string) => void;
  variant?: "default" | "spacious";
}) {
  const status = matchStatus && SUGGESTIONS[matchStatus] ? matchStatus : "scheduled";
  const bubbles = SUGGESTIONS[status];
  const isSpacious = variant === "spacious";

  return (
    <div className="space-y-3">
      {/* Quick actions — icon pills */}
      <div className={`flex flex-wrap ${isSpacious ? "justify-center gap-2.5" : "gap-2"}`}>
        {QUICK_ACTIONS.map(({ icon: Icon, label, query }) => (
          <button
            key={label}
            onClick={() => onSelectBubble(query)}
            className={`flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 hover:border-violet-500/40 text-zinc-300 transition-all cursor-pointer font-mono ${
              isSpacious
                ? "text-xs px-3.5 py-2 rounded-xl hover:bg-violet-950/30"
                : "text-[10px] px-2.5 py-1.5 rounded-lg"
            }`}
          >
            <Icon size={isSpacious ? 14 : 12} weight="duotone" className="text-violet-400/80" />
            {label}
          </button>
        ))}
      </div>
      {/* Context suggestions — centered text bubbles */}
      <div className={`flex flex-wrap ${isSpacious ? "justify-center gap-2.5" : "gap-2"}`}>
        {bubbles.map((q) => (
          <button
            key={q}
            onClick={() => onSelectBubble(q)}
            className={`bg-zinc-900 border border-zinc-800 hover:border-violet-500/40 text-zinc-300 transition-all cursor-pointer font-mono ${
              isSpacious
                ? "text-sm px-4 py-2 rounded-full hover:bg-violet-950/30"
                : "text-xs px-3 py-1.5 rounded-full"
            }`}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
