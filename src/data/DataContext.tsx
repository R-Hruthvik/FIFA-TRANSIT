"use client";

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import type { IDataProvider } from "@/data/types";
import { LiveProvider } from "@/data/live/LiveProvider";
import { DemoProvider } from "@/data/demo/DemoProvider";

interface DataContextValue {
  provider: IDataProvider;
  isDemoMode: boolean;
  toggleDemo: () => void;
  allowDemoMode: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [version, setVersion] = useState(0);
  const [allowDemoMode, setAllowDemoMode] = useState(true);
  const [provider, setProvider] = useState<IDataProvider>(() => new LiveProvider());

  useEffect(() => {
    provider.start();
    // Fetch server-side config to check if demo mode is allowed
    fetch("/api/config")
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg.allowDemoMode === false) {
          setAllowDemoMode(false);
        }
      })
      .catch(() => {});
    return () => {
      provider.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleDemo = useCallback(() => {
    if (!allowDemoMode) return; // server-side lockout

    setIsDemoMode((prev) => {
      const nextMode = !prev;
      provider.stop();

      if (nextMode) {
        const demo = new DemoProvider();
        demo.start();
        setProvider(demo);
      } else {
        const live = new LiveProvider();
        live.start();
        setProvider(live);
      }

      return nextMode;
    });
    setVersion((v) => v + 1);
  }, [allowDemoMode, provider]);

  const value = useMemo(
    () => ({ provider, isDemoMode, toggleDemo, allowDemoMode }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isDemoMode, version, toggleDemo, allowDemoMode, provider],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useDataContext() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useDataContext must be used within DataProvider");
  return ctx;
}

export function useData(): IDataProvider {
  return useDataContext().provider;
}

export function useDemoMode() {
  const ctx = useDataContext();
  return {
    isDemoMode: ctx.isDemoMode,
    toggleDemo: ctx.toggleDemo,
    allowDemoMode: ctx.allowDemoMode,
  };
}
