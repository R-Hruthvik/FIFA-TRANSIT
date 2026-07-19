"use client";

import { Trophy, Clock } from "@phosphor-icons/react";

interface MatchStatusStripProps {
  stadiumName?: string | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  status?: "scheduled" | "live" | "finished" | string | null;
  minute?: number | null;
  utcDate?: string | null;
}

function formatKickoff(utcDate?: string | null): string | null {
  if (!utcDate) return null;
  const d = new Date(utcDate);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MatchStatusStrip({
  stadiumName,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  status,
  minute,
  utcDate,
}: MatchStatusStripProps) {
  const hasMatch = !!homeTeam || !!awayTeam;
  const isLive = status === "live";
  const kickoff = formatKickoff(utcDate);

  return (
    <div className="px-6 pt-3 pb-1">
      <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-violet-950/30 to-zinc-900/40 border border-violet-500/15 px-4 py-2.5">
        <Trophy size={18} weight="duotone" className="text-violet-400 flex-shrink-0" />

        <div className="flex-1 min-w-0">
          {stadiumName && (
            <p className="text-[9px] font-mono tracking-wider text-zinc-500 uppercase truncate">
              {stadiumName}
            </p>
          )}

          {hasMatch ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-black text-white tracking-tight truncate">
                {homeTeam ?? "Home"}
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                {homeScore ?? 0}–{awayScore ?? 0}
              </span>
              <span className="font-black text-white tracking-tight truncate">
                {awayTeam ?? "Away"}
              </span>
              {isLive && (
                <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-rose-500/15 text-[9px] font-black tracking-widest uppercase text-rose-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  Live {minute != null ? `${minute}'` : ""}
                </span>
              )}
              {status === "finished" && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-zinc-700/40 text-[9px] font-black tracking-widest uppercase text-zinc-400">
                  FT
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
              <Clock size={12} weight="duotone" className="text-zinc-500" />
              {kickoff ? (
                <span className="font-mono">Kickoff {kickoff}</span>
              ) : (
                <span>No match scheduled</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
