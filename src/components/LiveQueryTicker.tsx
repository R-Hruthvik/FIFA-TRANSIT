"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Broadcast, Clock, Funnel } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFanQueries } from "@/data/hooks/useFanQueries";

interface LiveQueryTickerProps {
  gateFilter?: string | null;
}

export const LiveQueryTicker = ({ gateFilter }: LiveQueryTickerProps) => {
  const logs = useFanQueries();

  const GATE_LABELS: Record<string, string> = {
    gate1: "Gate G1",
    gate2: "Gate G2",
    gate3: "Gate G3",
    gate4: "Gate G4",
    gate5: "Gate G5",
    gate6: "Gate G6",
    gate7: "Gate G7",
    gate8: "Gate G8",
  };

  const filteredLogs = useMemo(() => {
    if (!gateFilter) return logs;
    const label = GATE_LABELS[gateFilter] || gateFilter;
    const regex = new RegExp(label, "i");
    return logs.filter((log) => regex.test(log.text));
  }, [logs, gateFilter]);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Broadcast
            size={18}
            weight="duotone"
            className="text-emerald-400 animate-pulse"
          />
          <h3 className="text-[10px] font-black tracking-[0.2em] text-white uppercase italic">
            Fan Query Stream
          </h3>
        </div>
        {gateFilter && (
          <Badge variant="outline" className="gap-1.5 border-amber-500/30 text-amber-500 text-[10px] font-bold py-0.5">
            <Funnel size={10} weight="fill" />
            {gateFilter}
          </Badge>
        )}
        <Badge variant="secondary" className="text-[8px] font-mono text-zinc-400">
          LIVE
        </Badge>
      </div>

      {/* Fixed-height scrollable log area — prevents page expansion */}
      <ScrollArea className="flex-1 max-h-[380px]">
        <div className="space-y-3 pr-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <motion.div
                  key={log._id}
                  layout
                  initial={{ opacity: 0, x: -10, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4 }}
                  className="group flex items-center gap-4 p-3 rounded-xl bg-zinc-900/20 border border-zinc-800/40 hover:bg-zinc-800/40 transition-all cursor-default"
                >
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <span className="text-[9px] font-black text-emerald-500/60 leading-none mb-1">
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <div className="w-px h-4 bg-zinc-800 group-hover:bg-emerald-500/30 transition-colors" />
                  </div>

                  <div className="flex-1 max-w-md">
                    <p className="text-[11px] text-zinc-400 font-medium tracking-wide line-clamp-2 group-hover:text-zinc-200 transition-colors leading-relaxed">
                      {log.text}
                    </p>
                  </div>

                  <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Clock size={16} weight="duotone" className="text-zinc-400" />
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-8 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center opacity-50 h-32">
                <p className="text-[10px] font-black tracking-widest text-zinc-400 uppercase italic text-center">
                  {gateFilter
                    ? `No active logs for ${gateFilter}`
                    : "Awaiting inbound queries..."}
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
};
