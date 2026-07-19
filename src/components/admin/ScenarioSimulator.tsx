"use client";

import { useState } from "react";
import { Sparkle, Play, Warning } from "@phosphor-icons/react";
import { useData } from "@/data/DataContext";
import type { ScenarioPayload } from "@/app/api/admin/scenario/route";

const EXAMPLE_PROMPTS = [
  "Simulate a sudden rainstorm during the 80th minute when Mexico scores an equalizer against Brazil.",
  "Gate G3 jammed at full-time with 50k fans exiting at once.",
  "Pre-match rush: 30k fans arrive in 10 minutes at Gate G1 and G2.",
];

export default function ScenarioSimulator() {
  const provider = useData();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [scenario, setScenario] = useState<ScenarioPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runScenario = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setScenario(null);
    try {
      const res = await fetch("/api/admin/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error("Scenario generation failed");
      const data = (await res.json()) as ScenarioPayload;
      setScenario(data);

      if (provider.loadScenario) {
        provider.loadScenario(data);
      }
    } catch (err) {
      setError("Failed to generate scenario. Check AI provider configuration.");
      console.error("Scenario simulator error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-2xl p-6 shadow-xl text-zinc-100">
      <div className="flex items-center gap-2 mb-4">
        <Sparkle size={18} weight="duotone" className="text-emerald-400" />
        <h2 className="text-xl text-white font-bold">Prompt-to-Scenario Simulator</h2>
      </div>
      <p className="text-sm text-zinc-400 mb-4">
        Describe an event in natural language. The AI Scenario Engine generates a
        structured 60-second training drill for staff.
      </p>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder="e.g. Simulate a sudden rainstorm during the 80th minute when Mexico scores..."
        className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl px-4 py-3 text-sm placeholder-zinc-600 focus:border-emerald-500/40 focus:ring-0 focus:outline-none transition-all resize-none"
      />

      <div className="flex flex-wrap gap-2 my-3">
        {EXAMPLE_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => setPrompt(p)}
            className="text-[10px] font-mono px-2 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
          >
            {p.length > 48 ? p.slice(0, 48) + "…" : p}
          </button>
        ))}
      </div>

      <button
        onClick={runScenario}
        disabled={loading || !prompt.trim()}
        className="inline-flex items-center gap-2 py-2 px-4 rounded-md text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 transition-colors"
      >
        <Play size={14} weight="bold" />
        {loading ? "Generating…" : "Generate Scenario"}
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-400 flex items-center gap-2">
          <Warning size={14} weight="duotone" /> {error}
        </p>
      )}

      {scenario && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
          <h3 className="text-sm font-bold text-emerald-400 mb-2">{scenario.title}</h3>
          <p className="text-xs text-zinc-300 mb-3">{scenario.broadcastMessage}</p>
          <div className="grid grid-cols-3 gap-2">
            {scenario.snapshots.map((s) => (
              <div key={s.t} className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800 text-[9px] font-mono">
                <div className="text-zinc-400 mb-1">t={s.t}s</div>
                {Object.entries(s.gateDensities).map(([g, d]) => (
                  <div key={g} className="flex justify-between">
                    <span className="text-zinc-400">{g.replace("Gate ", "G")}</span>
                    <span className={d > 0.65 ? "text-rose-400" : d > 0.35 ? "text-amber-400" : "text-emerald-400"}>
                      {Math.round(d * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
