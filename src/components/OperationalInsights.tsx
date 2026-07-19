"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import { CheckCircle, ArrowRight, ShieldCheck, Target, Warning, Sparkle } from "@phosphor-icons/react";
import { GateMetrics } from "@/types/telemetry";

interface OperationalInsightsProps {
  metrics: GateMetrics;
  transitWaitTime?: number;
}

const gateLabels: Record<string, string> = {
  gate1: "Gate G1",
  gate2: "Gate G2",
  gate3: "Gate G3",
  gate4: "Gate G4",
  gate5: "Gate G5",
  gate6: "Gate G6",
  gate7: "Gate G7",
  gate8: "Gate G8",
};

interface Insight {
  id: string;
  title: string;
  content: string;
  severity: "high" | "medium" | "low";
  icon: React.ReactNode;
}

/** AI commander payload (from /api/staff/ai-insights). */
interface TacticalDirective {
  id: string;
  targetGate: string;
  message: string;
  actionRequired: string;
  suggestedStewardCount: number;
}

interface AIInsight {
  severity: "NOMINAL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  tacticalDirectives: TacticalDirective[];
  broadcastDraft: string;
  generatedAt: number;
}

function generateInsights(metrics: GateMetrics, transitWaitTime: number): Insight[] {
  const insights: Insight[] = [];

  for (const [gate, status] of Object.entries(metrics)) {
    const label = gateLabels[gate] || gate;

    if (status === "high") {
      insights.push({
        id: `${gate}-high`,
        title: `Reserve Deployment`,
        content: `Deploy reserve security team to ${label} to handle critical congestion.`,
        severity: "high",
        icon: <ShieldCheck size={20} weight="duotone" />,
      });
    } else if (status === "medium") {
      insights.push({
        id: `${gate}-medium`,
        title: `Auxiliary Entry`,
        content: `Open auxiliary turnstiles at ${label} to relieve pressure.`,
        severity: "medium",
        icon: <Target size={20} weight="duotone" />,
      });
    } else {
      insights.push({
        id: `${gate}-low`,
        title: `${label} Flow OK`,
        content: `${label} throughput is normal. No action needed.`,
        severity: "low",
        icon: <CheckCircle size={20} weight="duotone" />,
      });
    }
  }

  if (transitWaitTime > 12) {
    insights.push({
      id: "transit-high",
      title: "Transit Alert",
      content: `Main Hub wait time is ${transitWaitTime} min. Consider additional shuttle deployment.`,
      severity: "high",
      icon: <Warning size={20} weight="duotone" />,
    });
  }

  return insights.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });
}

const SEVERITY_RANK: Record<string, 0 | 1 | 2 | 3 | 4> = {
  NOMINAL: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

const SEVERITY_META: Record<string, { color: string; bg: string; label: string }> = {
  NOMINAL: { color: "text-emerald-400", bg: "bg-emerald-500/10", label: "NOMINAL" },
  LOW: { color: "text-emerald-400", bg: "bg-emerald-500/10", label: "LOW" },
  MEDIUM: { color: "text-amber-400", bg: "bg-amber-500/10", label: "MEDIUM" },
  HIGH: { color: "text-orange-400", bg: "bg-orange-500/10", label: "HIGH" },
  CRITICAL: { color: "text-rose-400", bg: "bg-rose-500/10", label: "CRITICAL" },
};

import { useDemoMode } from "./DemoController";

export const OperationalInsights = ({ metrics, transitWaitTime = 0 }: OperationalInsightsProps) => {
  const demoContext = useDemoMode();
  const isDemoMode = demoContext?.isDemoMode ?? false;
  // Demo mode reuses the SAME shell as real mode — only the data source differs.
  const effectiveMetrics: GateMetrics = ((isDemoMode && demoContext?.getMetrics) ? demoContext.getMetrics() : metrics) ?? {} as GateMetrics;
  const insights = useMemo(() => generateInsights(effectiveMetrics, transitWaitTime), [effectiveMetrics, transitWaitTime]);

  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);

  const load = useCallback(async (bypass = false) => {
    setAiLoading(true);
    try {
      const res = await fetch(
        bypass ? "/api/staff/ai-insights?bypass=1" : "/api/staff/ai-insights",
      );
      if (res.ok) {
        const data = (await res.json()) as AIInsight & { rateLimited?: boolean };
        setAiInsight(data);
        setRateLimited(res.headers.get("X-RateLimited") === "true" || !!data.rateLimited);
      }
    } catch {
      // AI unavailable — fall back to static insights
    } finally {
      setAiLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = (bypass = false) => {
      if (cancelled) return;
      void load(bypass);
    };
    run();
    // Auto-poll at 60s — stays well under the 20 req/min NIM budget.
    const interval = setInterval(() => run(), 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [load]);

  const hasMetrics = effectiveMetrics && Object.keys(effectiveMetrics).length > 0;

  return (
    <div className="space-y-4">
      {/* Raw Telemetry Overview */}
      {hasMetrics ? (
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
          <h4 className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">
            Raw Gate Telemetry
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(effectiveMetrics).map(([gate, rawStatus]) => {
              const status = String(rawStatus ?? "low");
              return (
              <div key={gate} className="flex justify-between items-center p-2 rounded bg-zinc-950/40 border border-zinc-900/60">
                <span className="text-[10px] text-zinc-400 font-medium font-mono">{gateLabels[gate] || gate}</span>
                <span className={`text-[10px] font-bold font-mono uppercase ${
                  status === "high" ? "text-rose-500" :
                  status === "medium" ? "text-amber-500" :
                  "text-emerald-500"
                }`}>{status}</span>
              </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-center py-6">
          <p className="text-xs text-zinc-500">Gate telemetry data unavailable</p>
        </div>
      )}

      {/* AI Commander Status */}
      <div className="p-4 rounded-xl bg-zinc-900/10 border border-zinc-900 text-center py-6">
        {rateLimited && !aiLoading && (
          <p className="text-[10px] text-amber-400/80 font-mono mb-2">
            AI Commander rate-limited — showing deterministic analysis.
          </p>
        )}
        {aiLoading && (
          <p className="text-xs text-zinc-500 leading-relaxed font-mono">
            AI Commander analyzing telemetry…
          </p>
        )}
        {!aiLoading && aiInsight && (
          <div className="space-y-2">
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-[9px] font-black tracking-widest uppercase ${SEVERITY_META[aiInsight.severity]?.bg ?? SEVERITY_META.NOMINAL.bg} ${SEVERITY_META[aiInsight.severity]?.color ?? SEVERITY_META.NOMINAL.color}`}>
              <Sparkle size={10} weight="duotone" />
              {SEVERITY_META[aiInsight.severity]?.label ?? "NOMINAL"}
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {aiInsight.broadcastDraft}
            </p>
          </div>
        )}
        {!aiLoading && !aiInsight && (
          <p className="text-xs text-zinc-500 leading-relaxed">
            Live analysis will appear here when operational data is available.
          </p>
        )}
      </div>

      {/* Manual refresh — bypasses the shared rate limiter */}
      <button
        type="button"
        onClick={() => load(true)}
        disabled={aiLoading}
        className="w-full py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-black tracking-[0.2em] uppercase hover:bg-violet-500 hover:text-black transition-all disabled:opacity-40"
      >
        {aiLoading ? "ANALYZING…" : "REFRESH ANALYSIS"}
      </button>
    </div>
  );
};

