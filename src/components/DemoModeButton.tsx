"use client";

import { useDemoMode, useData } from "@/data/DataContext";

export function DemoModeButton() {
  const { isDemoMode, toggleDemo, allowDemoMode } = useDemoMode();
  const provider = useData();

  if (!allowDemoMode) return null;

  const minutes = Math.floor(provider.elapsedMs / 60000);
  const seconds = Math.floor((provider.elapsedMs % 60000) / 1000);
  const elapsedStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return (
    <button
      onClick={toggleDemo}
      className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-[0.15em] uppercase transition-all ${
        isDemoMode
          ? "bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30"
          : "bg-zinc-900/60 border border-zinc-800 hover:border-amber-500/50 text-zinc-400 hover:text-amber-400"
      }`}
    >
      <span className="relative z-10 flex items-center gap-2">
        {isDemoMode ? (
          <>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            DEMO LIVE · {elapsedStr}
          </>
        ) : (
          <>▶ START DEMO</>
        )}
      </span>
    </button>
  );
}
