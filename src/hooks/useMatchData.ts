"use client";

import { useMatch } from "@/data/hooks/useMatch";

export function useMatchData() {
  const { match, upcoming, isDemoMode, refetch } = useMatch();

  return {
    matches: match ? [match] : [],
    liveMatch: match,
    upcomingMatches: upcoming,
    loading: false,
    error: null,
    isDemoMode,
    refetch,
  };
}
