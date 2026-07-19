"use client";

import { useState, useEffect, useRef } from "react";
import { useData } from "@/data/DataContext";
import type { StadiumTelemetry } from "@/types/telemetry";

export function useTelemetry() {
  const provider = useData();
  const [telemetry, setTelemetry] = useState<StadiumTelemetry | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sync = () => {
    setTelemetry(provider.getTelemetry());
  };

  useEffect(() => {
    sync();
    intervalRef.current = setInterval(sync, provider.isDemo ? 500 : 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.isDemo]);

  return telemetry;
}
