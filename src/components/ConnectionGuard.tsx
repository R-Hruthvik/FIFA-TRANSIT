"use client";

import { motion, AnimatePresence } from "motion/react";
import { WifiSlash, Warning } from "@phosphor-icons/react";
import { useOnlineStatus, ConnectionStatus } from "@/hooks/useOnlineStatus";

function ConnectionBanner({ status }: { status: ConnectionStatus }) {
  if (status === "online") return null;

  const config: Record<
    ConnectionStatus,
    {
      icon: React.ReactNode;
      text: string;
      className: string;
    }
  > = {
    offline: {
      icon: <WifiSlash size={16} />,
      text: "OFFLINE — Showing cached data",
      className:
        "bg-zinc-800 border-zinc-700 text-zinc-300",
    },
    degraded: {
      icon: <Warning size={16} />,
      text: "CONNECTION UNSTABLE — Limited functionality",
      className:
        "bg-amber-500/10 border-amber-500/30 text-amber-400",
    },
    online: {
      icon: null,
      text: "",
      className: "",
    },
  };

  const { icon, text, className } = config[status];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={`overflow-hidden ${className} border-b px-4 py-2 flex items-center justify-center gap-2 text-[10px] font-black tracking-widest`}
      >
        {icon}
        {text}
      </motion.div>
    </AnimatePresence>
  );
}

export function ConnectionGuard({ children }: { children: React.ReactNode }) {
  const { connectionStatus } = useOnlineStatus();

  return (
    <>
      <ConnectionBanner status={connectionStatus} />
      {children}
    </>
  );
}
