"use client";

import { useDemoMode } from "./DemoController";
import { Badge } from "@/components/ui/badge";
import { Warning, CheckCircle, Clock, ArrowRight } from "@phosphor-icons/react";

const GATE_LABELS: Record<string, string> = {
  gate1: "Gate G1", gate2: "Gate G2", gate3: "Gate G3", gate4: "Gate G4",
  gate5: "Gate G5", gate6: "Gate G6", gate7: "Gate G7", gate8: "Gate G8",
};

const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  alert: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/20" },
  info: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
};

function formatTimestamp(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function GateAlertsPanel() {
  const demo = useDemoMode();

  if (!demo?.isDemoMode) {
    return (
      <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-center">
        <p className="text-[10px] text-zinc-500 font-mono uppercase">
          Start demo to see live gate alerts
        </p>
      </div>
    );
  }

  const recentEvents = demo.getRecentGateEvents?.(10) ?? [];
  const recentAlerts = recentEvents.filter((e) => e.type === "alert");

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
      {recentAlerts.length === 0 ? (
        <div className="p-3 rounded-lg bg-zinc-900/40 border border-zinc-800/80 text-center">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle size={14} weight="duotone" className="text-emerald-400" />
            <p className="text-[10px] text-zinc-500 font-mono uppercase">
              All gates operating normally
            </p>
          </div>
        </div>
      ) : (
        recentAlerts.map((event, i) => {
          const severity = SEVERITY_STYLES["alert"] || SEVERITY_STYLES.info;
          return (
            <div
              key={`${event.timestamp}-${i}`}
              className={`p-3 rounded-lg ${severity.bg} border ${severity.border} backdrop-blur-md`}
            >
              <div className="flex items-start gap-2">
                <Warning size={14} className={`${severity.text} mt-0.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className={`text-[10px] font-black tracking-wider uppercase ${severity.text}`}>
                      {GATE_LABELS[event.gate] ?? event.gate}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono">
                      {formatTimestamp(event.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{event.message}</p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
