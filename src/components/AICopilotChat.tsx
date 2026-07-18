"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PaperPlaneRight, Sparkle, User, Robot } from "@phosphor-icons/react";
import { useChatStream } from "@/hooks/useChatStream";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useDemoMode } from "./DemoController";

export function AICopilotChat() {
  const { messages, isLoading, sendMessage } = useChatStream();
  const { isOnline } = useOnlineStatus();
  const demoContext = useDemoMode();
  const isDemoMode = demoContext?.isDemoMode ?? false;

  const [inputValue, setInputValue] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const hasMounted = useRef(false);

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

  const quickQueries = [
    "Security status",
    "Gate capacity",
    "Transit alerts",
  ];

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
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {quickQueries.map((q) => (
            <button
              key={q}
              onClick={() => {
                if (canChat) setInputValue(q);
              }}
              disabled={!canChat}
              className="group flex items-center gap-2 px-4 py-2 text-[10px] font-black tracking-widest bg-zinc-900/40 border border-zinc-800 hover:border-emerald-500/50 text-zinc-400 hover:text-white transition-all rounded-xl whitespace-nowrap disabled:opacity-30 disabled:pointer-events-none"
            >
              <Sparkle size={12} weight="duotone" className="group-hover:text-emerald-400" />
              {q.toUpperCase()}
            </button>
          ))}
        </div>

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
