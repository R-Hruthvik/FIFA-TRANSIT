"use client";

import { useState, useEffect, useCallback } from "react";
import type { Role, StaffStatus } from "@/types/auth";

export function useStaffStatus() {
  const [status, setStatus] = useState<StaffStatus>("none");
  const [role, setRole] = useState<Role>("fan");
  const [isLoading, setIsLoading] = useState(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data.staffStatus || "none");
        setRole(data.role || "fan");
      }
    } catch (err) {
      console.error("Failed to poll staff status:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initTimer = setTimeout(() => { void fetchStatus(); }, 0);

    // Only set up polling if status is pending
    let interval: NodeJS.Timeout | null = null;
    
    const checkLoop = async () => {
      try {
        const res = await fetch("/api/staff/status");
        if (res.ok) {
          const data = await res.json();
          const nextStatus = data.staffStatus || "none";
          const nextRole = data.role || "fan";
          
          setStatus(nextStatus);
          setRole(nextRole);

          // If approved or rejected, reload to refresh session & route guards
          if (nextStatus === "approved" || nextStatus === "rejected") {
            window.location.reload();
          }
        }
      } catch (err) {
        console.error("Error in status check loop:", err);
      }
    };

    interval = setInterval(checkLoop, 5000);

    return () => {
      clearTimeout(initTimer);
      if (interval) clearInterval(interval);
    };
  }, [fetchStatus]);

  return { role, staffStatus: status, isLoading, refetch: fetchStatus };
}
