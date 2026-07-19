"use client";

import { useState, useEffect, useRef } from "react";
import { useData } from "@/data/DataContext";
import type { Match } from "@/lib/match-api";

export function useMatch() {
  const provider = useData();
  const [match, setMatch] = useState<Match | null>(null);
  const [upcoming, setUpcoming] = useState<Match[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sync = () => {
    const result = provider.getMatch();
    setMatch(result.match);
    setUpcoming(result.upcoming);
  };

  useEffect(() => {
    sync();
    intervalRef.current = setInterval(sync, provider.isDemo ? 500 : 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider.isDemo]);

  return { match, upcoming, isDemoMode: provider.isDemo, refetch: sync };
}
