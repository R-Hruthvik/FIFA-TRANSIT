"use client";

import { useState, useEffect, useMemo } from "react";
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

export const OperationalInsights = ({ metrics, transitWaitTime = 8 }: OperationalInsightsProps) => {
  const demoContext = useDemoMode();
  const isDemoMode = demoContext?.isDemoMode ?? false;
  const insights = useMemo(() => generateInsights(metrics, transitWaitTime), [metrics, transitWaitTime]);

  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setAiLoading(true);
      try {
        const res = await fetch("/api/staff/ai-insights");
        if (res.ok) {
          const data = (await res.json()) as AIInsight;
          if (!cancelled) setAiInsight(data);
        }
      } catch {
        // AI unavailable — fall back to static insights
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (!isDemoMode) {
    return (
      <div className="space-y-4">
        {/* Raw Telemetry Overview */}
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-3">
          <h4 className="text-[9px] font-black tracking-widest text-zinc-500 uppercase">
            Raw Gate Telemetry
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(metrics).map(([gate, status]) => (
              <div key={gate} className="flex justify-between items-center p-2 rounded bg-zinc-950/40 border border-zinc-900/60">
                <span className="text-[10px] text-zinc-400 font-medium font-mono">{gateLabels[gate] || gate}</span>
                <span className={`text-[10px] font-bold font-mono uppercase ${
                  status === "high" ? "text-rose-500" :
                  status === "medium" ? "text-amber-500" :
                  "text-emerald-500"
                }`}>{status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Commander Status */}
        <div className="p-4 rounded-xl bg-zinc-900/10 border border-zinc-900 text-center py-6">
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
      </div>
    );
  }

  // Demo mode — prefer AI commander directives when available, else static.
  const aiDirectives = aiInsight?.tacticalDirectives ?? [];
  const aiSeverity = aiInsight ? SEVERITY_RANK[aiInsight.severity] : -1;

  return (
    <div className="space-y-4">
      {aiLoading && (
        <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest text-center py-2">
          AI Commander analyzing telemetry…
        </p>
      )}

      {aiDirectives.length > 0 ? (
        aiDirectives.map((d, i) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ x: 4 }}
            className="group p-4 rounded-xl bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 hover:border-amber-500/30 transition-all cursor-default"
          >
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg ${SEVERITY_META[aiInsight!.severity]?.bg ?? SEVERITY_META.MEDIUM.bg} ${SEVERITY_META[aiInsight!.severity]?.color ?? SEVERITY_META.MEDIUM.color}`}>
                <Sparkle size={20} weight="duotone" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-[11px] font-black tracking-widest text-white uppercase italic">
                    {d.targetGate}
                  </h4>
                  {d.suggestedStewardCount > 0 && (
                    <span className="text-[9px] font-mono text-amber-400">
                      +{d.suggestedStewardCount} stewards
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium tracking-wide">
                  {d.message}
                </p>
                <p className="text-[10px] text-zinc-500 mt-1 italic">
                  Action: {d.actionRequired}
                </p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center text-amber-400">
                <ArrowRight size={16} weight="bold" />
              </div>
            </div>
          </motion.div>
        ))
      ) : (
        insights.map((insight, i) => (
          <motion.div
            key={insight.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ x: 4 }}
            className="group p-4 rounded-xl bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 hover:border-amber-500/30 transition-all cursor-default"
          >
            <div className="flex items-start gap-4">
              <div className={`p-2 rounded-lg ${
                insight.severity === 'high' ? 'text-rose-400 bg-rose-500/10' :
                insight.severity === 'medium' ? 'text-amber-400 bg-amber-500/10' :
                'text-emerald-400 bg-emerald-500/10'
              }`}>
                {insight.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-[11px] font-black tracking-widest text-white uppercase italic">
                    {insight.title}
                  </h4>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    insight.severity === 'high' ? 'bg-rose-500 animate-pulse' :
                    insight.severity === 'medium' ? 'bg-amber-500' :
                    'bg-emerald-500'
                  }`} />
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-medium tracking-wide">
                  {insight.content}
                </p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center text-amber-400">
                <ArrowRight size={16} weight="bold" />
              </div>
            </div>
          </motion.div>
        ))
      )}

      {/* AI Broadcast Draft */}
      {aiInsight?.broadcastDraft && (
        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <p className="text-[9px] font-black tracking-widest text-amber-400 uppercase mb-1">
            AI Broadcast Draft
          </p>
          <p className="text-xs text-zinc-300 leading-relaxed">{aiInsight.broadcastDraft}</p>
        </div>
      )}

      {/* Action CTA */}
      <button className="w-full mt-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black tracking-[0.2em] uppercase hover:bg-amber-500 hover:text-black transition-all">
        VIEW FULL TACTICAL LOG
      </button>
    </div>
  );
};

