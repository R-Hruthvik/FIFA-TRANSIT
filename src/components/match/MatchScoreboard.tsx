"use client";

import { Match } from "@/lib/match-api";
import { Badge } from "@/components/ui/badge";
import { Trophy, SoccerBall } from "@phosphor-icons/react";

interface MatchScoreboardProps {
  match: Match | null;
  isMock?: boolean;
  matchError?: string | null;
}

export function MatchScoreboard({ match, isMock, matchError }: MatchScoreboardProps) {
  if (!match) return null;

  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  return (
    <div className={`relative overflow-hidden rounded-2xl border p-6 bg-gradient-to-r ${
      isLive 
        ? "from-emerald-950/30 via-[#0a2318]/40 to-zinc-900/50 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.08)]"
        : "from-zinc-900/60 to-zinc-950/60 border-zinc-800/80"
    }`}>
      {/* Glow highlight */}
      {isLive && (
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-emerald-500/5 blur-[80px] pointer-events-none" />
      )}

      <div className="flex flex-col items-center justify-center text-center space-y-4">
        {/* Matchday context */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <Trophy size={14} weight="duotone" className="text-amber-500" />
          <span className="text-[9px] font-black tracking-[0.2em] text-zinc-400 uppercase italic">
            2026 FIFA World Cup™ Group Stage
          </span>
          {isLive && (
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-rose-500 animate-ping" />
              <Badge className="bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono text-[8px] px-1 py-0 uppercase">
                LIVE {match.minute ? `'${match.minute}` : ""}
              </Badge>
            </span>
          )}
        </div>

        {/* Board */}
        <div className="flex items-center justify-center gap-8 w-full max-w-md">
          {/* Home Team */}
          <div className="flex-1 text-right">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              {match.homeTeam}
            </h3>
            <span className="text-[10px] text-zinc-400 font-mono">HOME</span>
          </div>

          {/* Scores */}
          <div className="flex items-center gap-3 bg-zinc-950/60 px-5 py-2.5 rounded-2xl border border-zinc-800/60 font-mono">
            <span className="text-xl font-black text-white">
              {match.homeScore !== null ? match.homeScore : "0"}
            </span>
            <span className="text-zinc-400 text-xs font-black">:</span>
            <span className="text-xl font-black text-white">
              {match.awayScore !== null ? match.awayScore : "0"}
            </span>
          </div>

          {/* Away Team */}
          <div className="flex-1 text-left">
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              {match.awayTeam}
            </h3>
            <span className="text-[10px] text-zinc-400 font-mono">AWAY</span>
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center gap-2 text-zinc-400 text-[10px] font-medium">
          <SoccerBall size={14} weight="duotone" className="animate-spin-slow" />
          <span>{isMock ? "Demo mode • LIVE simulation" : "Stadium Ops sync active • Real-time gate routing calculated"}</span>
        </div>

        {matchError && !isLive && (
          <p className="text-[9px] text-red-400/80 font-mono mt-1">
            {matchError}
          </p>
        )}
      </div>
    </div>
  );
}
