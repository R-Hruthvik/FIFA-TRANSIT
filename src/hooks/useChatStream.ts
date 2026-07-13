"use client";

import { useState, useRef, useCallback } from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const STREAM_TIMEOUT_MS = 30_000;

export function useChatStream() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "System online. How can I assist with tournament logistics today?",
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    setMessages((prev) => [...prev, userMessage]);
    loadingRef.current = true;
    setIsLoading(true);

    const assistantId = crypto.randomUUID();
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    abortRef.current = new AbortController();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    // Safety timeout: if stream hangs for 30s, force-reset loading state
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
        body: JSON.stringify({
          messages: [
            ...messages
              .filter((m) => m.id !== "1")
              .concat(userMessage)
              .map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
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
  }, [messages]);

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: "System online. How can I assist with tournament logistics today?",
        timestamp: new Date(),
      },
    ]);
  }, []);

  return { messages, isLoading, sendMessage, clearChat };
}
