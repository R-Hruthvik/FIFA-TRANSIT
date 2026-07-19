"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Sparkle, Robot, Warning } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";

interface ProactiveAssistantPanelProps {
  section?: string;
  language?: string;
  trackingEnabled?: boolean;
  location?: string;
  transitWaitTime?: number;
  weatherCondition?: "clear" | "rain";
}

/**
 * AI Proactive Assistant Status Panel.
 *
 * Renders a context-aware, AI-generated briefing at the top of the Fan Hub
 * so the fan receives guidance without typing into a chat. Refreshes when
 * the fan's context (tracking, transit, weather) changes.
 */
export function ProactiveAssistantPanel({
  section,
  language = "en",
  trackingEnabled = false,
  location,
  transitWaitTime,
  weatherCondition,
}: ProactiveAssistantPanelProps) {
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/fan/narrative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section,
            language,
            trackingEnabled,
            location,
            transitWaitTime,
            weatherCondition,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { narrative: string };
          if (!cancelled) setNarrative(data.narrative);
        }
      } catch {
        // keep deterministic fallback text
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [section, language, trackingEnabled, location, transitWaitTime, weatherCondition]);

  return (
    <Card className="p-5 bg-gradient-to-br from-emerald-950/40 to-zinc-950/40 border border-emerald-500/20">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
          <Robot size={16} weight="duotone" />
        </div>
        <div className="flex-1">
          <h2 className="text-[10px] font-black tracking-[0.2em] text-emerald-400 uppercase italic">
            AI Proactive Assistant
          </h2>
          <p className="text-[9px] text-zinc-500 font-mono">
            {trackingEnabled ? "LIVE · PERSONALIZED" : "GENERIC MODE"}
          </p>
        </div>
        <Sparkle size={16} weight="duotone" className="text-emerald-400/60" />
      </div>

      {loading ? (
        <p className="text-xs text-zinc-500 leading-relaxed font-mono">
          Generating your personalized briefing…
        </p>
      ) : narrative ? (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-zinc-200 leading-relaxed"
        >
          {narrative}
        </motion.p>
      ) : (
        <p className="text-xs text-zinc-400 leading-relaxed flex items-start gap-2">
          <Warning size={14} weight="duotone" className="text-amber-400 mt-0.5 flex-shrink-0" />
          Enable live tracking for a personalized exit route.
        </p>
      )}
    </Card>
  );
}
