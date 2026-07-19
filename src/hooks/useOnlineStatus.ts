"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type ConnectionStatus = "online" | "degraded" | "offline";

const HEALTH_CHECK_INTERVAL_MS = 30_000;
const HEALTH_CHECK_TIMEOUT_MS = 5_000;

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [isApiHealthy, setIsApiHealthy] = useState<boolean | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    "online",
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const checkBackend = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setIsApiHealthy(false);
      setConnectionStatus("offline");
      return;
    }

    try {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      const controller = new AbortController();
      timeoutRef.current = setTimeout(
        () => controller.abort(),
        HEALTH_CHECK_TIMEOUT_MS,
      );

      const res = await fetch("/api/health", {
        signal: controller.signal,
        cache: "no-store",
      });

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (res.ok) {
        setIsApiHealthy(true);
        setConnectionStatus("online");
      } else {
        setIsApiHealthy(false);
        setConnectionStatus("degraded");
      }
    } catch {
      setIsApiHealthy(false);
      setConnectionStatus(
        typeof navigator !== "undefined" && navigator.onLine
          ? "degraded"
          : "offline",
      );
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkBackend();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setIsApiHealthy(false);
      setConnectionStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const initTimer = setTimeout(checkBackend, 0);

    intervalRef.current = setInterval(checkBackend, HEALTH_CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [checkBackend]);

  return { isOnline, isApiHealthy, connectionStatus, checkBackend };
}
