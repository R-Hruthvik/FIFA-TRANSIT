"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PaperPlaneRight, User, Robot, Sparkle } from "@phosphor-icons/react";
import { useChatStream } from "@/hooks/useChatStream";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useData } from "@/data/DataContext";
import { QueryBubbles } from "./QueryBubbles";
import { MatchStatusStrip } from "./MatchStatusStrip";

interface ScoreData {
  homeScore: number | null;
  awayScore: number | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
}

interface GateDensity {
  [gate: string]: string;
}

type AvatarState = "idle" | "thinking" | "excited" | "alert";

const ASCII_FRAMES: Record<AvatarState, string[]> = {
  idle: [
    " ◕‿◕\n ready\nwhen you are!",
    " ◕_◕\n ready\nwhen you are!",
    " ◕‿◕\n ready\nwhen you are!",
    " ◕‿◕\n ready\nwhen you are!",
  ],
  thinking: [
    "(⊙_⊙)\nchecking\nthe feed.  ",
    "(◉_◉)\nchecking\nthe feed.. ",
    "(⊙_⊙)\nchecking\nthe feed...",
    "(◉_◉)\nchecking\nthe feed.. ",
  ],
  excited: [
    "╰(◕‿◕)╯\nLETS\nGOOOO!",
    "╰(◕▽◕)╯\nLETS\nGOOOO!",
    "╰(◕‿◕)╯\nLETS\nGOOOO!",
    "╰(◕▽◕)╯\nLETS\nGOOOO!",
  ],
  alert: [
    "(⊙＿⊙)\nheya!\nheads-up!",
    " (⊙△⊙)\nheya!\nheads-up!",
    "(⊙＿⊙)\nheya!\nheads-up!",
    " (⊙△⊙)\nheya!\nheads-up!",
  ],
};

function getAvatarState(isLoading: boolean, msgCount: number): AvatarState {
  if (isLoading) return "thinking";
  if (msgCount === 0) return "idle";
  return "excited";
}

export function AICopilotChat({
  matchStatus,
  matchScore,
  liveMatch,
  stadiumName,
  matchPersona,
  gateDensity,
  language,
  trackingEnabled,
  location,
  transitWaitTime,
  weatherCondition,
}: {
  matchStatus?: string;
  matchScore?: ScoreData | null;
  liveMatch?: {
    homeTeam?: string | null;
    awayTeam?: string | null;
    homeScore?: number | null;
    awayScore?: number | null;
    status?: string | null;
    minute?: number | null;
    utcDate?: string | null;
  } | null;
  stadiumName?: string | null;
  matchPersona?: "miri" | "torque";
  gateDensity?: GateDensity | null;
  language?: string;
  trackingEnabled?: boolean;
  location?: string;
  transitWaitTime?: number;
  weatherCondition?: "clear" | "rain";
}) {
  const { messages, isLoading, error, retryLast, sendMessage } = useChatStream(
    matchScore || gateDensity
      ? {
          persona: matchPersona ?? "miri",
          matchData: matchScore ?? null,
          gateDensity: gateDensity ?? null,
        }
      : undefined,
  );
  const { isOnline } = useOnlineStatus();
  const provider = useData();
  const isDemoMode = provider.isDemo;

  const stripMatch = liveMatch ?? null;
  const stripStadium = stadiumName ?? null;

  const [inputValue, setInputValue] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasMounted = useRef(false);

  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [briefingDismissed, setBriefingDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setBriefingLoading(true);
      try {
        const res = await fetch("/api/fan/narrative", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            language: language ?? "en",
            trackingEnabled: trackingEnabled ?? false,
            location: location ?? undefined,
            transitWaitTime: transitWaitTime ?? undefined,
            weatherCondition: weatherCondition ?? undefined,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as { narrative: string };
          if (!cancelled) setBriefing(data.narrative);
        }
      } catch {
      } finally {
        if (!cancelled) setBriefingLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [language, trackingEnabled, location, transitWaitTime, weatherCondition]);

  const handleSelectBubble = useCallback((query: string) => {
    if (!isLoading && (isOnline || isDemoMode)) {
      setInputValue(query);
      setTimeout(() => sendMessage(query), 0);
    }
  }, [isLoading, isOnline, isDemoMode, sendMessage]);

  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (hasMounted.current) {
      scrollToBottom();
    } else {
      hasMounted.current = true;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || (!isOnline && !isDemoMode)) return;
    const content = inputValue;
    setInputValue("");
    await sendMessage(content);
  };

  const canChat = isOnline || isDemoMode;
  const avatarState = getAvatarState(isLoading, messages.length);
  const personaLabel = (matchPersona ?? "miri") === "miri" ? "MIRI" : "TORQUE";

  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const speed = avatarState === "thinking" ? 400 : avatarState === "alert" ? 500 : 1200;
    const interval = setInterval(() => setFrame((f) => (f + 1) % ASCII_FRAMES[avatarState].length), speed);
    return () => clearInterval(interval);
  }, [avatarState]);

  const borderGlow = avatarState === "idle"
    ? "border-violet-500/20"
    : avatarState === "thinking"
      ? "border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
      : avatarState === "excited"
        ? "border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
        : "border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.15)]";

  const dotColor = avatarState === "idle"
    ? "bg-violet-500"
    : avatarState === "thinking"
      ? "bg-amber-500"
      : avatarState === "excited"
        ? "bg-emerald-500"
        : "bg-red-500";

  return (
    <div className="flex flex-col h-full bg-zinc-950/20 backdrop-blur-sm">
      {/* Match focus strip — main visual above chat */}
      <MatchStatusStrip
        stadiumName={stripStadium}
        homeTeam={stripMatch?.homeTeam ?? null}
        awayTeam={stripMatch?.awayTeam ?? null}
        homeScore={stripMatch?.homeScore ?? null}
        awayScore={stripMatch?.awayScore ?? null}
        status={stripMatch?.status ?? null}
        minute={stripMatch?.minute ?? null}
        utcDate={stripMatch?.utcDate ?? null}
      />

      {/* Unified Header — persona label + ASCII art on the right */}
      <div className="px-6 py-3 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <motion.div
              key={avatarState}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`w-2 h-2 rounded-full ${dotColor} animate-pulse`}
            />
            <h2 className="text-[11px] font-black tracking-[0.25em] text-violet-400 uppercase">
              {personaLabel}
            </h2>
            <span className="text-[9px] font-mono tracking-wider text-zinc-400 border border-zinc-800 px-2 py-0.5 rounded-md">
              ENCRYPTED
            </span>
          </div>
          <motion.p
            key={avatarState}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[10px] text-zinc-400 font-mono ml-5"
          >
            {avatarState === "idle" && "ready for your questions"}
            {avatarState === "thinking" && `processing${".".repeat((frame % 3) + 1)}`}
            {avatarState === "excited" && "let's go!"}
            {avatarState === "alert" && "heads up!"}
          </motion.p>
        </div>

        {/* ASCII Art Panel — right side */}
        <motion.div
          key={avatarState}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className={`flex-shrink-0 w-28 h-28 rounded-xl bg-gradient-to-br from-violet-950/40 to-zinc-900/60 border flex items-center justify-center overflow-hidden transition-shadow duration-300 ${borderGlow}`}
        >
          <motion.pre
            key={`${avatarState}-${frame}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="font-mono text-[10px] leading-tight text-violet-400/80 text-center select-none whitespace-pre"
          >
            {ASCII_FRAMES[avatarState][frame]}
          </motion.pre>
        </motion.div>
      </div>

      {/* Collapsible AI Briefing */}
      {!briefingDismissed && (briefing || briefingLoading) && (
        <div className="px-6 pb-3">
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative p-3 rounded-xl bg-violet-950/20 border border-violet-500/15"
          >
            {briefingLoading ? (
              <p className="text-xs text-zinc-400 font-mono">Generating briefing...</p>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <Sparkle size={11} weight="duotone" className="text-violet-400" />
                  <span className="text-[9px] font-black tracking-wider text-violet-400 uppercase">
                    AI Briefing
                  </span>
                </div>
                <p className="text-[13px] text-zinc-300 leading-relaxed pr-6">{briefing}</p>
                <button
                  onClick={() => setBriefingDismissed(true)}
                  aria-label="Dismiss briefing"
                  className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-300 text-xs px-1.5 py-0.5 rounded"
                >
                  ×
                </button>
              </>
            )}
          </motion.div>
        </div>
      )}

      {/* Chat Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-6 py-3 space-y-5 scrollbar-hide"
      >
        {messages.length === 0 && !canChat && (
          <div className="flex items-center justify-center h-32 text-zinc-400 text-xs">
            You are offline — AI assistant unavailable
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border ${
                msg.role === "user"
                  ? "bg-violet-500/20 border-violet-500/30 text-violet-400"
                  : "bg-zinc-800/60 border-zinc-700/50 text-zinc-400"
              }`}>
                {msg.role === "user" ? <User size={14} weight="duotone" /> : <Robot size={14} weight="duotone" />}
              </div>

              <div className={`relative px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed max-w-[80%] ${
                msg.role === "user"
                  ? "bg-violet-600/10 text-violet-50 border border-violet-500/20 rounded-tr-none"
                  : "bg-zinc-800/40 text-zinc-200 border border-zinc-700/40 rounded-tl-none"
              }`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Area — bigger centered bubbles */}
      <div className="px-6 pb-5 pt-2 space-y-3">
        <QueryBubbles
          matchStatus={matchStatus}
          onSelectBubble={handleSelectBubble}
          variant="spacious"
        />

        {error && !isLoading && (
          <div className="px-6 pb-2">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5">
              <span className="text-[11px] text-red-300">{error}</span>
              <button
                type="button"
                onClick={retryLast}
                className="text-[10px] font-black tracking-wider uppercase px-3 py-1 rounded-lg bg-red-500/20 text-red-200 hover:bg-red-500/30 transition-all flex-shrink-0"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative group">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={canChat ? "Ask me anything about match day..." : "You are offline — AI assistant unavailable"}
            className="w-full bg-zinc-900/60 border border-zinc-800 group-focus-within:border-violet-500/50 px-6 py-4 rounded-2xl text-sm text-white placeholder-zinc-600 focus:outline-none transition-all shadow-inner disabled:opacity-50"
            disabled={isLoading || !canChat}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading || !canChat}
            aria-label="Send message"
            className="absolute right-2 top-2 bottom-2 px-5 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:hover:bg-violet-600 text-white rounded-xl transition-all flex items-center justify-center group-focus-within:shadow-[0_0_20px_rgba(139,92,246,0.3)]"
          >
            <PaperPlaneRight size={20} weight="bold" />
          </button>
        </form>
      </div>
    </div>
  );
}
