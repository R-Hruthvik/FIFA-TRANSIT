"use client";

import { useState, useEffect, useRef } from "react";
import { useData } from "@/data/DataContext";
import type { GateMetrics } from "@/types/telemetry";

export function useMetrics() {
  const provider = useData();
  const [metrics, setMetrics] = useState<GateMetrics | null>(() => provider.getMetrics());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sync = () => {
    setMetrics(provider.getMetrics());
  };

  useEffect(() => {
    intervalRef.current = setInterval(sync, provider.isDemo ? 500 : 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.isDemo]);

  return metrics;
}
