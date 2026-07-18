"use client";

const SUGGESTIONS: Record<string, string[]> = {
  scheduled: [
    "Find section entry gate",
    "Check transit hub wait times",
    "Opt-in to crowd tracking",
  ],
  live: [
    "Give me a match status brief",
    "Fastest path to snacks at halftime",
    "Current gate congestion",
  ],
  finished: [
    "Let's beat traffic: show my exit path",
    "Are shuttles experiencing delays?",
    "Report exit blockage",
  ],
};

export function QueryBubbles({
  matchStatus,
  onSelectBubble,
}: {
  matchStatus?: string;
  onSelectBubble: (query: string) => void;
}) {
  const status = matchStatus && SUGGESTIONS[matchStatus] ? matchStatus : "scheduled";
  const bubbles = SUGGESTIONS[status];

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2">
      {bubbles.map((q) => (
        <button
          key={q}
          onClick={() => onSelectBubble(q)}
          className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 text-zinc-300 text-xs px-3 py-1.5 rounded-full transition-all cursor-pointer font-mono"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
