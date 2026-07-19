"use client";

import { useCallback } from "react";
import { useData } from "@/data/DataContext";

export function useEnforcement() {
  const provider = useData();

  const applyGateOverride = useCallback(
    (gate: string, status: "OPEN" | "CLOSED" | "LIMITED") => {
      provider.applyGateOverride(gate, status);
    },
    [provider],
  );

  const applyStewardDispatch = useCallback(
    (location: string, count: number) => {
      provider.applyStewardDispatch(location, count);
    },
    [provider],
  );

  const applyIncidentReport = useCallback(
    (description: string, severity: string, location: string) => {
      provider.applyIncidentReport(description, severity, location);
    },
    [provider],
  );

  return { applyGateOverride, applyStewardDispatch, applyIncidentReport };
}
