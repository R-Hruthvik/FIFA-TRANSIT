"use client";

import { Match } from "@/lib/match-api";
import { MatchCard } from "./MatchCard";

interface MatchScheduleProps {
  matches: Match[];
}

export function MatchSchedule({ matches }: MatchScheduleProps) {
  if (matches.length === 0) {
    return (
      <div className="p-6 border border-dashed border-zinc-800 rounded-2xl text-center opacity-65">
        <p className="text-xs text-zinc-500 font-medium">No upcoming matches scheduled.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
