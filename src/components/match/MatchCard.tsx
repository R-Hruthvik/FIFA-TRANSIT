"use client";

import { Match } from "@/lib/match-api";
import { Badge } from "@/components/ui/badge";
import { SoccerBall } from "@phosphor-icons/react";

interface MatchCardProps {
  match: Match;
}

export function MatchCard({ match }: MatchCardProps) {
  const isLive = match.status === "live";
  const isFinished = match.status === "finished";

  return (
    <div className={`p-4 rounded-xl border transition-all duration-200 ${
      isLive 
        ? "bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.05)]" 
        : "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-800"
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isLive ? (
            <Badge className="bg-rose-600 hover:bg-rose-500 text-white gap-1.5 text-[9px] font-black tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              LIVE {match.minute ? `'${match.minute}` : ""}
            </Badge>
          ) : isFinished ? (
            <Badge variant="secondary" className="text-[9px] font-black tracking-widest uppercase text-zinc-500 bg-zinc-800/50">
              FINISHED
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[9px] font-black tracking-widest uppercase border-zinc-800 text-zinc-400">
              SCHEDULED
            </Badge>
          )}
        </div>
        <span className="text-[10px] font-mono text-zinc-500">
          {new Date(match.utcDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300">{match.homeTeam}</span>
          <span className="text-sm font-black text-white font-mono">
            {match.homeScore !== null ? match.homeScore : "-"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300">{match.awayTeam}</span>
          <span className="text-sm font-black text-white font-mono">
            {match.awayScore !== null ? match.awayScore : "-"}
          </span>
        </div>
      </div>
    </div>
  );
}
