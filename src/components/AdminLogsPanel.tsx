"use client";

import { useDemoMode } from "./DemoController";
import { Badge } from "@/components/ui/badge";

const CATEGORY_STYLES: Record<string, { bg: string; text: string }> = {
  crowd: { bg: "bg-red-500/10", text: "text-red-400" },
  gate: { bg: "bg-amber-500/10", text: "text-amber-400" },
  system: { bg: "bg-blue-500/10", text: "text-blue-400" },
};

const LEVEL_STYLES: Record<string, string> = {
  info: "text-emerald-400",
  warning: "text-amber-400",
  alert: "text-red-400",
};

function formatLogTimestamp(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function AdminLogsPanel() {
  const demo = useDemoMode();

  if (!demo?.isDemoMode) {
    return (
      <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-center">
        <p className="text-[10px] text-zinc-500 font-mono uppercase">
          Start demo to view server logs
        </p>
      </div>
    );
  }

  const logs = demo.getRecentAdminLogs?.(30) ?? [];

  return (
    <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-thin font-mono text-[9px]">
      {logs.length === 0 ? (
        <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80 text-center">
          <p className="text-zinc-500 text-[9px] uppercase">No log entries yet</p>
        </div>
      ) : (
        logs.slice().reverse().map((entry, i) => (
          <div
            key={`${entry.timestamp}-${i}`}
            className={`p-2 rounded border ${
              entry.level === "alert"
                ? "bg-red-950/20 border-red-900/40"
                : entry.level === "warning"
                ? "bg-amber-950/20 border-amber-900/40"
                : "bg-zinc-900/40 border-zinc-800/80"
            }`}
          >
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-zinc-600 text-[9px]">
                [{formatLogTimestamp(entry.timestamp)}]
              </span>
              <span className={`font-bold uppercase ${LEVEL_STYLES[entry.level]}`}>
                {entry.level}
              </span>
              <span className={`text-[9px] uppercase ${
                CATEGORY_STYLES[entry.category]?.text ?? "text-zinc-400"
              }`}>
                [{entry.category}]
              </span>
            </div>
            <p className="text-zinc-400 leading-relaxed">{entry.message}</p>
          </div>
        ))
      )}
    </div>
  );
}
