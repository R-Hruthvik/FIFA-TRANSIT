"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Robot, ChatCenteredText, CheckCircle, Warning } from "@phosphor-icons/react";
import { Card } from "@/components/ui/card";
import { MatchStatusStrip } from "./MatchStatusStrip";

interface CmdMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ok?: boolean;
}

const SUGGESTIONS = [
  "Close Gate G3",
  "Open Gate G1",
  "Dispatch 4 stewards to main-hub",
  "Limit Gate G5",
];

/**
 * Staff Enforcement — Agentic Command Bar.
 *
 * Lets operations staff control stadium flow via natural-language commands
 * that the LLM maps onto executable tools (gate override / steward dispatch).
 */
export function StaffCommandBar({
  match,
  stadiumName,
}: {
  match?: {
    homeTeam?: string | null;
    awayTeam?: string | null;
    homeScore?: number | null;
    awayScore?: number | null;
    status?: string | null;
    minute?: number | null;
    utcDate?: string | null;
  } | null;
  stadiumName?: string | null;
}) {
  const [messages, setMessages] = useState<CmdMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: CmdMessage = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await fetch("/api/staff/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = (await res.json()) as { reply: string; ok?: boolean };
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply,
          ok: data.ok,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: "Command failed.", ok: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card data-section="ai-command" className="p-6">
      <MatchStatusStrip
        stadiumName={stadiumName ?? null}
        homeTeam={match?.homeTeam ?? null}
        awayTeam={match?.awayTeam ?? null}
        homeScore={match?.homeScore ?? null}
        awayScore={match?.awayScore ?? null}
        status={match?.status ?? null}
        minute={match?.minute ?? null}
        utcDate={match?.utcDate ?? null}
      />
      <div className="flex items-center gap-3 mt-3 mb-4">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/20 border border-amber-500/30 text-amber-400">
          <Robot size={16} weight="duotone" />
        </div>
        <h2 className="text-[10px] font-black tracking-[0.2em] text-white uppercase italic">
          AI Enforcement Copilot
        </h2>
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto mb-3 scrollbar-thin">
        {messages.length === 0 && (
          <p className="text-[11px] text-zinc-500 italic">
            Issue commands like &ldquo;Close Gate G3&rdquo; or &ldquo;Dispatch 4 stewards to main-hub&rdquo;.
          </p>
        )}
        <AnimatePresence>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-2 ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-emerald-600/10 border border-emerald-500/20 text-emerald-50"
                    : m.ok === false
                      ? "bg-red-500/10 border border-red-500/20 text-red-300"
                      : "bg-zinc-800/40 border border-zinc-700/50 text-zinc-200"
                }`}
              >
                {m.role === "assistant" && (
                  <span className="mr-1 inline-block align-middle">
                    {m.ok === false ? (
                      <Warning size={12} weight="duotone" className="text-red-400" />
                    ) : (
                      <CheckCircle size={12} weight="duotone" className="text-emerald-400" />
                    )}
                  </span>
                )}
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="text-[9px] font-mono px-2 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700 text-zinc-400 hover:text-amber-400 hover:border-amber-500/30 transition-all"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="relative"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Command the stadium flow…"
          className="w-full bg-zinc-900/60 border border-zinc-800 focus-within:border-amber-500/50 px-4 py-3 rounded-xl text-sm text-white placeholder-zinc-600 focus:outline-none transition-all"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="absolute right-2 top-2 bottom-2 px-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 rounded-lg text-white transition-all flex items-center"
        >
          <ChatCenteredText size={16} weight="bold" />
        </button>
      </form>
    </Card>
  );
}
