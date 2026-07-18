"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Match } from "@/lib/match-api";
import { useDemoMode } from "@/components/DemoController";

export function useMatchData() {
  const { isDemoMode, demoElapsed, getMatchState } = useDemoMode() || { isDemoMode: false };
  const [matches, setMatches] = useState<Match[]>([]);
  const [liveMatch, setLiveMatch] = useState<Match | null>(null);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (isDemoMode) {
      setIsMock(true);
      setLiveMatch({
        id: "demo-match-live",
        homeTeam: "United States",
        awayTeam: "England",
        homeScore: 2,
        awayScore: 1,
        status: "live",
        utcDate: new Date().toISOString(),
        minute: 74
      });
      setUpcomingMatches([]);
      setLoading(false);
      return;
    }

    try {
      const [resMatches, resSchedule] = await Promise.all([
        fetch("/api/match"),
        fetch("/api/match/schedule"),
      ]);

      if (!resMatches.ok || !resSchedule.ok) throw new Error("Failed to fetch matches");

      const [dataMatches, dataSchedule] = await Promise.all([
        resMatches.json(),
        resSchedule.json(),
      ]);

      const allMatches: Match[] = dataMatches.matches || [];
      const scheduled: Match[] = dataSchedule.schedule || [];
      const mockFlag = dataMatches.isMock ?? dataSchedule.isMock ?? true;

      setMatches(allMatches);
      setIsMock(mockFlag);

      if (mockFlag) {
        // No real data source configured — show empty, not simulated match.
        setLiveMatch(null);
        setUpcomingMatches([]);
      } else {
        const live = allMatches.find((m) => m.status === "live");
        setLiveMatch(live || allMatches[0] || null);
        setUpcomingMatches(scheduled);
      }
      setLoading(false);
    } catch (err: any) {
      console.error("Failed to sync match data:", err);
      setError(err.message || "Match sync failed");
      setIsMock(false);
      setLiveMatch(null);
      setLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    fetchMatches();

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only poll when NOT in demo mode, and at a reasonable interval
    if (!isDemoMode) {
      intervalRef.current = setInterval(() => {
        fetchMatches();
      }, 30000); // 30 seconds — less frequent, reduces load
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isDemoMode, fetchMatches]);

  const demoMatch = useMemo<Match | null>(() => {
    if (isDemoMode && getMatchState) {
      const simState = getMatchState();
      return {
        id: "demo-match",
        homeTeam: "United States",
        awayTeam: "England",
        homeScore: simState.homeScore,
        awayScore: simState.awayScore,
        status: simState.phase === "full-time" ? "finished" : (simState.phase === "pre-match" ? "scheduled" : "live"),
        utcDate: new Date().toISOString(),
        minute: simState.minute,
      };
    }
    return null;
  }, [isDemoMode, demoElapsed, getMatchState]);

  return {
    matches,
    liveMatch: isDemoMode ? demoMatch : liveMatch,
    upcomingMatches,
    loading,
    error,
    isMock,
    isDemoMode,
    refetch: fetchMatches,
  };
}
