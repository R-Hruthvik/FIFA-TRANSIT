"use client";

import { useState, useEffect, useRef } from "react";
import { useData } from "@/data/DataContext";
import type { GateEvent } from "@/data/types";

export function useGateEvents() {
  const provider = useData();
  const [events, setEvents] = useState<GateEvent[]>(() => provider.getGateEvents());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sync = () => {
    setEvents(provider.getGateEvents());
  };

  useEffect(() => {
    intervalRef.current = setInterval(sync, provider.isDemo ? 500 : 15000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.isDemo]);

  return events;
}
