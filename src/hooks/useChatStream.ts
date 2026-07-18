"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useDemoMode } from "@/components/DemoController";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ScoreData {
  homeScore: number | null;
  awayScore: number | null;
  homeTeam?: string | null;
  awayTeam?: string | null;
}

interface GateDensity {
  [gate: string]: string;
}

interface ProactiveConfig {
  persona: "miri" | "torque";
  matchData?: ScoreData | null;
  gateDensity?: GateDensity | null;
}

const STREAM_TIMEOUT_MS = 30_000;
const SYSTEM_PROMPT_ID = "1";

const MIRI_GOAL_TEMPLATES = [
  "GOOOAL! %HOME% just scored! The stadium is electric! ⚡",
  "YEEEESS! %HOME% puts one in the back of the net! Get in! 🎉",
  "What a strike from %HOME%! The crowd is going wild! 🔥",
];

const TORQUE_GOAL_TEMPLATES = [
  "Heads up — %HOME% scored. Expect a crowd surge near the east concourse.",
  "Goal detected: %HOME%. Gate pressure about to spike — stay frosty.",
  "Alert: %HOME% goal. Re-routing field teams toward sections 105-110.",
];

const MIRI_GATE_ALERT_TEMPLATES = [
  "Heads up! %GATE% is getting packed — might want to avoid that area! 🚶‍♂️🚶‍♀️",
  "Crowd alert! %GATE% is looking busy right now. Planning an alternate route?",
];

const TORQUE_GATE_ALERT_TEMPLATES = [
  "Flag: %GATE% density just jumped. Recommend dispatching a flow marshal.",
  "Ops note: %GATE% pressure increasing. Consider opening overflow lane.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function useChatStream(proactiveConfig?: ProactiveConfig) {
  const demoContext = useDemoMode();
  const isDemoMode = demoContext?.isDemoMode ?? false;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const loadingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesRef = useRef<Message[]>(messages);

  const prevScoreRef = useRef<{ home: number | null; away: number | null }>({ home: null, away: null });
  const prevGatesRef = useRef<GateDensity>({});
  const proactiveKeyRef = useRef(0);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

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

    const messagesForApi = messagesRef.current
      .filter((m) => m.id !== SYSTEM_PROMPT_ID)
      .concat(userMessage)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    if (isDemoMode && demoContext) {
      loadingRef.current = true;
      setIsLoading(true);

      setTimeout(() => {
        const responseText = demoContext.getDemoAiResponse(content);
        let currentText = "";
        const words = responseText.split(" ");
        let wordIndex = 0;

        const streamInterval = setInterval(() => {
          if (wordIndex < words.length) {
            currentText += (wordIndex === 0 ? "" : " ") + words[wordIndex];
            wordIndex++;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: currentText } : m
              )
            );
          } else {
            clearInterval(streamInterval);
            loadingRef.current = false;
            setIsLoading(false);
          }
        }, 60);
      }, 500);
      return;
    }

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
        body: JSON.stringify({
          messages: messagesForApi,
          role: proactiveConfig?.persona === "torque" ? "staff" : "fan",
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
  }, [proactiveConfig?.persona, isDemoMode, demoContext]);

  const addProactiveMessage = useCallback((content: string) => {
    const msg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
  }, []);

  const proactiveMatchData = proactiveConfig?.matchData ?? null;
  const proactiveGateDensity = proactiveConfig?.gateDensity ?? null;
  const proactivePersona = proactiveConfig?.persona ?? "miri";

  useEffect(() => {
    const matchData = proactiveMatchData;
    const gateDensity = proactiveGateDensity;
    const persona = proactivePersona;

    if (matchData) {
      const prevScore = prevScoreRef.current;
      const curHome = matchData.homeScore;
      const curAway = matchData.awayScore;
      const homeTeam = matchData.homeTeam || "Home";
      const awayTeam = matchData.awayTeam || "Away";

      if (prevScore.home !== null && curHome !== null && curHome > prevScore.home) {
        const template = persona === "miri"
          ? pick(MIRI_GOAL_TEMPLATES)
          : pick(TORQUE_GOAL_TEMPLATES);
        addProactiveMessage(template.replace(/%HOME%/g, homeTeam));
        proactiveKeyRef.current++;
      }

      if (prevScore.away !== null && curAway !== null && curAway > prevScore.away) {
        const template = persona === "miri"
          ? pick(MIRI_GOAL_TEMPLATES)
          : pick(TORQUE_GOAL_TEMPLATES);
        addProactiveMessage(template.replace(/%HOME%/g, awayTeam));
        proactiveKeyRef.current++;
      }

      prevScoreRef.current = { home: curHome, away: curAway };
    }

    if (gateDensity) {
      const prev = prevGatesRef.current;
      for (const [gate, status] of Object.entries(gateDensity)) {
        if (prev[gate] && prev[gate] !== status && (status === "high" || status === "medium")) {
          const template = persona === "miri"
            ? pick(MIRI_GATE_ALERT_TEMPLATES)
            : pick(TORQUE_GATE_ALERT_TEMPLATES);
          addProactiveMessage(template.replace(/%GATE%/g, gate));
          proactiveKeyRef.current++;
        }
      }
      prevGatesRef.current = { ...gateDensity };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    proactiveMatchData?.homeScore,
    proactiveMatchData?.awayScore,
    proactiveMatchData?.homeTeam,
    proactiveMatchData?.awayTeam,
    proactiveGateDensity,
    proactivePersona,
    addProactiveMessage,
  ]);

  const clearChat = useCallback(() => {
    setMessages([]);
    prevScoreRef.current = { home: null, away: null };
    prevGatesRef.current = {};
  }, []);

  return { messages, isLoading, sendMessage, clearChat };
}
