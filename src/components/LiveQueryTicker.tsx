"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Broadcast, Clock, Funnel } from "@phosphor-icons/react";

interface Log {
  _id: string;
  text: string;
  timestamp: string;
}

interface LiveQueryTickerProps {
  gateFilter?: string | null;
}

export const LiveQueryTicker = ({ gateFilter }: LiveQueryTickerProps) => {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/fan/queries");
        const data = await res.json();
        if (mounted && data.logs) {
          setLogs(data.logs);
        }
      } catch (error) {
        console.error("Failed to fetch logs:", error);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const filteredLogs = useMemo(() => {
    if (!gateFilter) return logs;
    // Simple regex check for the gate name in the log text
    const regex = new RegExp(gateFilter, 'i');
    return logs.filter(log => regex.test(log.text));
  }, [logs, gateFilter]);

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Broadcast size={18} weight="duotone" className="text-emerald-400 animate-pulse" />
          <h3 className="text-[10px] font-black tracking-[0.2em] text-white uppercase italic">
            Fan Query Stream
          </h3>
        </div>
        {gateFilter && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
            <Funnel size={10} weight="fill" className="text-amber-500" />
            <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest">{gateFilter}</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 scrollbar-hide">
        <AnimatePresence mode="popLayout" initial={false}>
          {filteredLogs.length > 0 ? filteredLogs.map((log) => (
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
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <div className="w-px h-4 bg-zinc-800 group-hover:bg-emerald-500/30 transition-colors" />
              </div>

              <div className="flex-1">
                <p className="text-[11px] text-zinc-400 font-medium tracking-wide line-clamp-2 group-hover:text-zinc-200 transition-colors leading-relaxed">
                  {log.text}
                </p>
              </div>

              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Clock size={16} weight="duotone" className="text-zinc-600" />
              </div>
            </motion.div>
          )) : (
            <div className="p-8 border border-dashed border-zinc-800 rounded-2xl flex flex-col items-center justify-center opacity-50 h-32">
              <p className="text-[10px] font-black tracking-widest text-zinc-600 uppercase italic text-center">
                {gateFilter ? `No active logs for ${gateFilter}` : "Awaiting inbound queries..."}
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
