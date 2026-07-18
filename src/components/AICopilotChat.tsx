"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PaperPlaneRight, User, Robot } from "@phosphor-icons/react";
import { useChatStream } from "@/hooks/useChatStream";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useDemoMode } from "./DemoController";
import { QueryBubbles } from "./QueryBubbles";

interface ScoreData {
  homeScore: number | null;
  awayScore: number | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
}

interface GateDensity {
  [gate: string]: string;
}

export function AICopilotChat({
  matchStatus,
  matchScore,
  matchPersona,
  gateDensity,
}: {
  matchStatus?: string;
  matchScore?: ScoreData | null;
  matchPersona?: "miri" | "torque";
  gateDensity?: GateDensity | null;
}) {
  const { messages, isLoading, sendMessage } = useChatStream(
    matchScore || gateDensity
      ? {
          persona: matchPersona ?? "miri",
          matchData: matchScore ?? null,
          gateDensity: gateDensity ?? null,
        }
      : undefined,
  );
  const { isOnline } = useOnlineStatus();
  const demoContext = useDemoMode();
  const isDemoMode = demoContext?.isDemoMode ?? false;

  const [inputValue, setInputValue] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasMounted = useRef(false);

  const handleSelectBubble = useCallback((query: string) => {
    if (!isLoading && (isOnline || isDemoMode)) {
      setInputValue(query);
      // Defer submission so state settles
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

  return (
    <div className="flex flex-col h-full bg-zinc-950/20 backdrop-blur-sm">
      {/* Chat Messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide"
      >
        {messages.length === 0 && !canChat && (
          <div className="flex items-center justify-center h-32 text-zinc-500 text-xs">
            You are offline — AI assistant unavailable
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex items-start gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${
                msg.role === "user" 
                  ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" 
                  : "bg-amber-500/20 border-amber-500/30 text-amber-400"
              }`}>
                {msg.role === "user" ? <User size={16} weight="duotone" /> : <Robot size={16} weight="duotone" />}
              </div>
              
              <div className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed max-w-[80%] ${
                msg.role === "user"
                  ? "bg-emerald-600/10 text-emerald-50 border border-emerald-500/20 rounded-tr-none"
                  : "bg-zinc-800/40 text-zinc-200 border border-zinc-700/50 rounded-tl-none"
              }`}>
                {msg.content}
                <div className={`absolute top-0 w-2 h-2 ${
                  msg.role === "user" ? "-right-2 bg-emerald-600/10" : "-left-2 bg-zinc-800/40"
                }`} style={{ clipPath: msg.role === "user" ? "polygon(0 0, 0 100%, 100% 0)" : "polygon(100% 0, 100% 100%, 0 0)" }} />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-6 pt-0 space-y-4">
        <QueryBubbles matchStatus={matchStatus} onSelectBubble={handleSelectBubble} />

        <form onSubmit={handleSubmit} className="relative group">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={canChat ? "Query tournament database..." : "You are offline — AI assistant unavailable"}
            className="w-full bg-zinc-900/60 border border-zinc-800 group-focus-within:border-emerald-500/50 px-6 py-4 rounded-2xl text-sm text-white placeholder-zinc-600 focus:outline-none transition-all shadow-inner disabled:opacity-50"
            disabled={isLoading || !canChat}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading || !canChat}
            className="absolute right-2 top-2 bottom-2 px-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white rounded-xl transition-all flex items-center justify-center group-focus-within:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            <PaperPlaneRight size={20} weight="bold" />
          </button>
        </form>
      </div>
    </div>
  );
}
