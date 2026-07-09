"use client";

import { useState, useRef, useEffect } from "react";
import type { MockTransitData } from "./TransitDashboard";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AICopilotChatProps {
  stadiumState: MockTransitData;
}

export function AICopilotChat({ stadiumState }: AICopilotChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Welcome! Ask me about gates, transit, or walking routes.",
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Build a placeholder for the streaming assistant message
    const assistantId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    try {
      abortRef.current = new AbortController();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            ...messages
              .filter((m) => m.id !== "1") // skip initial greeting
              .concat(userMessage)
              .map((m) => ({ role: m.role, content: m.content })),
          ],
          stadiumState,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }

      // Stream response chunks into the assistant message
      reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content + chunk }
              : m,
          ),
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;

      // Fallback: show error in assistant message
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "⚠️ Connection lost. Please try again." }
            : m,
        ),
      );
    } finally {
      if (reader) {
        reader.releaseLock();
      }
      setIsLoading(false);
      abortRef.current = null;
    }
  };

  const quickQueries = [
    "Best gate now?",
    "Hub wait times",
    "Walking route",
    "Weather check",
  ];

  const triggerQuickQuery = (q: string) => {
    setInputValue(q);
    setTimeout(() => {
      handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    }, 0);
  };

  return (
    <div className="flex flex-col h-[320px] bg-zinc-950 border-t border-zinc-800">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-cyan-500/20 text-cyan-300 rounded-tr-none"
                  : "bg-zinc-800 text-zinc-200 rounded-tl-none"
              }`}
            >
              {msg.content || (
                <span className="animate-pulse text-zinc-400">...</span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 space-y-3 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {quickQueries.map((q) => (
            <button
              key={q}
              onClick={() => triggerQuickQuery(q)}
              className="px-3 py-1.5 text-xs bg-zinc-800 border border-zinc-700 rounded-full text-zinc-300 whitespace-nowrap active:scale-95 transition-transform"
            >
              {q}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about gates, hubs, routes..."
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-full px-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="bg-cyan-500 text-black px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
