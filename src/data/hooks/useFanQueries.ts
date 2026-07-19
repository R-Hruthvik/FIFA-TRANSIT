"use client";

import { useState, useEffect, useRef } from "react";
import { useData } from "@/data/DataContext";

export interface Log {
  _id: string;
  text: string;
  timestamp: string;
}

export function useFanQueries() {
  const provider = useData();
  const [logs, setLogs] = useState<Log[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (provider.isDemo) {
      setLogs([]);
      const inject = () => {
        const text = provider.getFanQuery();
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
      };
      inject();
      const id = setTimeout(function schedule() {
        inject();
        setTimeout(schedule, 1500 + Math.random() * 3500);
      }, 1500 + Math.random() * 3500);
      return () => clearTimeout(id);
    }

    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/fan/queries");
        const data = await res.json();
        if (data.logs) setLogs(data.logs);
      } catch {
        // ignore
      }
    };
    fetchLogs();

    const es = new EventSource("/api/fan/queries/stream");
    sseRef.current = es;
    es.onmessage = (event) => {
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
      } catch {
        // ignore
      }
    };
    es.onerror = () => {
      es.close();
      pollRef.current = setInterval(fetchLogs, 5000);
    };

    return () => {
      es.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.isDemo]);

  return logs;
}
