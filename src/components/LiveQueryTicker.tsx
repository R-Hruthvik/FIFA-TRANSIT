"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Broadcast, Clock, Funnel } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDemoMode } from "./DemoController";

interface Log {
  _id: string;
  text: string;
  timestamp: string;
}

interface LiveQueryTickerProps {
  gateFilter?: string | null;
}

export const LiveQueryTicker = ({ gateFilter }: LiveQueryTickerProps) => {
  const demoContext = useDemoMode();
  const isDemoMode = demoContext?.isDemoMode ?? false;

  const [logs, setLogs] = useState<Log[]>([]);
  const [connectionType, setConnectionType] = useState<"sse" | "polling">("polling");
  const connectionTypeRef = useRef(connectionType);
  useEffect(() => {
    connectionTypeRef.current = connectionType;
  }, [connectionType]);

  // Clear logs when starting demo mode
  useEffect(() => {
    if (isDemoMode) {
      setLogs([]);
    }
  }, [isDemoMode]);

  // Initial fetch
  useEffect(() => {
    if (isDemoMode) return;
    let mounted = true;
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/fan/queries");
        const data = await res.json();
        if (mounted && data.logs) {
          setLogs(data.logs);
        }
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      }
    };
    fetchLogs();
    return () => { mounted = false; };
  }, [isDemoMode]);

  // SSE connection with polling fallback
  useEffect(() => {
    if (isDemoMode) return;
    let mounted = true;
    let eventSource: EventSource | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let sseSettled = false;

    const startPolling = () => {
      if (pollInterval) return;
      setConnectionType("polling");
      pollInterval = setInterval(async () => {
        if (!mounted) return;
        try {
          const res = await fetch("/api/fan/queries");
          const data = await res.json();
          if (mounted && data.logs) {
            setLogs(data.logs);
          }
        } catch {}
      }, 5000);

      setTimeout(() => {
        if (mounted && connectionTypeRef.current === "polling") {
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
          sseSettled = false;
          startSSE();
        }
      }, 30000);
    };

    const startSSE = () => {
      try {
        eventSource = new EventSource("/api/fan/queries/stream");

        eventSource.onmessage = (event) => {
          if (!mounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.logs) {
              setLogs((prev) => {
                const existingIds = new Set(prev.map((l) => l._id));
                const newLogs = data.logs.filter((l: Log) => !existingIds.has(l._id));
                if (newLogs.length === 0) return prev;
                return [...newLogs, ...prev].slice(0, 100);
              });
            }
          } catch {}
        };

        eventSource.onerror = () => {
          if (sseSettled) return;
          sseSettled = true;
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          startPolling();
        };

        eventSource.onopen = () => {
          sseSettled = true;
          if (mounted) setConnectionType("sse");
        };
      } catch {
        sseSettled = true;
        startPolling();
      }
    };

    startSSE();

    const fallbackTimer = setTimeout(() => {
      if (mounted && !sseSettled) {
        startPolling();
      }
    }, 3000);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isDemoMode]);

  // Demo queries injection — random intervals, no fixed schedule
  useEffect(() => {
    if (!isDemoMode || !demoContext) return;

    // Inject initial query immediately
    const initialQuery = demoContext.injectDemoQuery();
    if (initialQuery) {
      setLogs((prev) => {
        const newLog: Log = {
          _id: `demo-${Date.now()}-${Math.random()}`,
          text: initialQuery,
          timestamp: new Date().toISOString(),
        };
        return [newLog, ...prev];
      });
    }

    // Schedule next log at a random interval (1.5s–5s)
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const scheduleNext = () => {
      const delay = 1500 + Math.random() * 3500;
      timeoutId = setTimeout(() => {
        const text = demoContext.injectDemoQuery();
        if (text) {
          setLogs((prev) => {
            const newLog: Log = {
              _id: `demo-${Date.now()}-${Math.random()}`,
              text,
              timestamp: new Date().toISOString(),
            };
            return [newLog, ...prev].slice(0, 100);
          });
        }
        scheduleNext();
      }, delay);
    };

    scheduleNext();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isDemoMode, demoContext]);

  const GATE_LABELS: Record<string, string> = {
    gate1: "Gate G1",
    gate2: "Gate G2",
    gate3: "Gate G3",
    gate4: "Gate G4",
    gate5: "Gate G5",
    gate6: "Gate G6",
    gate7: "Gate G7",
    gate8: "Gate G8",
  };

  const filteredLogs = useMemo(() => {
    if (!gateFilter) return logs;
    const label = GATE_LABELS[gateFilter] || gateFilter;
    const regex = new RegExp(label, "i");
    return logs.filter((log) => regex.test(log.text));
  }, [logs, gateFilter]);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Broadcast
            size={18}
            weight="duotone"
            className="text-emerald-400 animate-pulse"
          />
          <h3 className="text-[10px] font-black tracking-[0.2em] text-white uppercase italic">
            Fan Query Stream
          </h3>
        </div>
        {gateFilter && (
          <Badge variant="outline" className="gap-1.5 border-amber-500/30 text-amber-500 text-[10px] font-bold py-0.5">
            <Funnel size={10} weight="fill" />
            {gateFilter}
          </Badge>
        )}
        <Badge variant="secondary" className="text-[8px] font-mono text-zinc-500">
          {connectionType === "sse" ? "SSE" : "POLL"}
        </Badge>
      </div>

      {/* Fixed-height scrollable log area — prevents page expansion */}
      <ScrollArea className="flex-1 max-h-[380px]">
        <div className="space-y-3 pr-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <motion.div
                  key={log._id}
                  layout
                  initial={{ opacity: 0, x: -10, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4 }}
                  className="group flex items-center gap-4 p-3 rounded-xl bg-zinc-900/20 border border-zinc-800/40 hover:bg-zinc-800/40 transition-all cursor-default"
                >
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <span className="text-[9px] font-black text-emerald-500/60 leading-none mb-1">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <div className="w-px h-4 bg-zinc-800 group-hover:bg-emerald-500/30 transition-colors" />
                  </div>

                  <div className="flex-1 max-w-md">
                    <p className="text-[11px] text-zinc-400 font-medium tracking-wide line-clamp-2 group-hover:text-zinc-200 transition-colors leading-relaxed">
                      {log.text}
                    </p>
                  </div>

                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Clock size={16} weight="duotone" className="text-zinc-600" />
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-8 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center opacity-50 h-32">
                <p className="text-[10px] font-black tracking-widest text-zinc-600 uppercase italic text-center">
                  {gateFilter
                    ? `No active logs for ${gateFilter}`
                    : "Awaiting inbound queries..."}
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
};
