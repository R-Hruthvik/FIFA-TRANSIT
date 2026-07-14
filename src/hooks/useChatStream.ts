"use client";

import { useState, useRef, useCallback } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const STREAM_TIMEOUT_MS = 30_000;
const SYSTEM_PROMPT_ID = "1";

export function useChatStream() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: SYSTEM_PROMPT_ID,
      role: "assistant",
      content: "System online. How can I assist with tournament logistics today?",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef<Message[]>(messages);

  // Keep ref in sync with state so async callbacks always read latest
  messagesRef.current = messages;

  const clearStreamTimeout = () => {
    if (timeoutRef.current) {
      globalThis.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || loadingRef.current) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    const assistantId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    // Build the full message list for the API (exclude system prompt, append new messages)
    const messagesForApi = messagesRef.current
      .filter((m) => m.id !== SYSTEM_PROMPT_ID)
      .concat(userMessage)
      .map((m) => ({ role: m.role, content: m.content }));

    // Update state first
    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    loadingRef.current = true;
    setIsLoading(true);
    abortRef.current = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    timeoutRef.current = setTimeout(() => {
      if (loadingRef.current) {
        loadingRef.current = false;
        setIsLoading(false);
        abortRef.current?.abort();
        abortRef.current = null;
      }
    }, STREAM_TIMEOUT_MS);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesForApi }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      if (!res.body) throw new Error("No response body");

      reader = res.body.getReader();
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
      if (err instanceof Error && err.name === "AbortError") {
        // If aborted by our timeout, show a message
        if (loadingRef.current) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "⚠️ Response timed out. Please try again." }
                : m,
            ),
          );
        }
        return;
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "⚠️ Connection lost. Please try again." }
            : m,
        ),
      );
    } finally {
      clearStreamTimeout();
      if (reader) {
        reader.releaseLock();
      }
      loadingRef.current = false;
      setIsLoading(false);
      abortRef.current = null;
    }
  }, []); // messages read via messagesRef — no state dependency needed

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: SYSTEM_PROMPT_ID,
        role: "assistant",
        content: "System online. How can I assist with tournament logistics today?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  return { messages, isLoading, sendMessage, clearChat };
}
