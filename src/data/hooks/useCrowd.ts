"use client";

import { useState, useEffect, useRef } from "react";
import { useData } from "@/data/DataContext";
import type { CrowdPosition } from "@/data/types";

export function useCrowd() {
  const provider = useData();
  const [positions, setPositions] = useState<CrowdPosition[]>([]);
  const [count, setCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sync = () => {
    setPositions(provider.getCrowdPositions());
    setCount(provider.getCrowdCount());
  };

  useEffect(() => {
    sync();
    intervalRef.current = setInterval(sync, provider.isDemo ? 500 : 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.isDemo]);

  return { positions, count };
}
