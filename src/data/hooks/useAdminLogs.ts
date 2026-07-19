"use client";

import { useState, useEffect, useRef } from "react";
import { useData } from "@/data/DataContext";
import type { AdminLogEntry } from "@/data/types";

export function useAdminLogs() {
  const provider = useData();
  const [logs, setLogs] = useState<AdminLogEntry[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sync = () => {
    setLogs(provider.getAdminLogs());
  };

  useEffect(() => {
    sync();
    intervalRef.current = setInterval(sync, provider.isDemo ? 500 : 20000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.isDemo]);

  return logs;
}
