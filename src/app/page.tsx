"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, ShieldCheck, Users, Command, UserCircle } from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import FanHub from "@/components/FanHub";
import StaffHub from "@/components/StaffHub";
import { DemoModeButton } from "@/components/DemoController";
import { AppTab } from "@/types/telemetry";
import { UserMenu } from "@/components/auth/UserMenu";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function Page() {
  const { data: session, status } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <main className="min-h-screen w-full overflow-y-auto flex flex-col bg-gradient-to-br from-zinc-950 via-[#01170f] to-zinc-950 text-white font-sans selection:bg-emerald-500/30 relative">
        <StadiumBackground />
        <div className="min-h-screen flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            <p className="text-zinc-400 text-sm font-medium tracking-wider">
              Loading...
            </p>
          </motion.div>
        </div>
      </main>
    );
  }

  // If not authenticated, show landing page
  if (!session?.user) {
    return (
      <main className="min-h-screen w-full overflow-y-auto flex flex-col bg-gradient-to-br from-zinc-950 via-[#01170f] to-zinc-950 text-white font-sans selection:bg-emerald-500/30 relative">
        <StadiumBackground />
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 text-center"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotateY: 180 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 relative"
          >
            <div className="absolute inset-0 bg-amber-400/20 blur-3xl rounded-full animate-pulse" />
            <div className="relative z-10 p-6 bg-zinc-900/20 backdrop-blur-sm rounded-3xl border border-white/10 shadow-2xl">
              <Trophy size={100} weight="duotone" className="text-amber-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-7xl font-black tracking-tighter text-white mb-4 uppercase italic leading-none">
              FIFA TOURNAMENT<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-white to-amber-400">
                MANAGEMENT SUITE
              </span>
            </h1>
            <p className="text-zinc-400 max-w-[600px] mx-auto text-lg mb-10 leading-relaxed font-light tracking-wide">
              Unified digital control system for the 2026 World Cup operations, fan engagement, and stadium logistics.
            </p>
          </motion.div>

          <div className="flex gap-4 mb-8">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(16,185,129,0.4)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="group relative px-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl overflow-hidden transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            >
              <span className="relative z-10 flex items-center gap-3 tracking-[0.2em] text-sm">
                CONTINUE WITH GOOGLE
                <Command size={20} weight="bold" />
              </span>
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              />
              <div className="absolute inset-0 rounded-2xl border border-white/20 group-hover:border-white/40 transition-colors" />
            </motion.button>

            <a
              href="/signup"
              className="group relative px-10 py-5 bg-zinc-800/50 hover:bg-zinc-800 text-white font-black rounded-2xl overflow-hidden transition-all duration-300 border border-zinc-700/50"
            >
              <span className="relative z-10 flex items-center gap-3 tracking-[0.2em] text-sm">
                CREATE ACCOUNT
                <UserCircle size={20} weight="duotone" />
              </span>
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              />
              <div className="absolute inset-0 rounded-2xl border border-white/20 group-hover:border-white/40 transition-colors" />
            </a>
          </div>

          <p className="text-zinc-500 text-sm mt-6">
            By continuing, you agree to our{" "}
            <a href="#" className="text-emerald-400 hover:underline">
              Terms of Service
            </a>{" "}
          </p>
        </motion.div>
      </main>
    );
  }

  // Authenticated user - show dashboard
  const [activeTab, setActiveTab] = useState<AppTab>("fan");

  return (
    <ProtectedRoute allowedRoles={["fan", "staff", "admin"]}>
      <main className="min-h-screen w-full overflow-y-auto flex flex-col bg-gradient-to-br from-zinc-950 via-[#01170f] to-zinc-950 text-white font-sans selection:bg-emerald-500/30 relative">
        <StadiumBackground />

        {/* Top Bar */}
        <header className="relative z-10 flex items-center justify-between px-4 md:px-6 py-4 border-b border-white/5 bg-zinc-950/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-2 bg-emerald-600/20 rounded-xl border border-emerald-500/30"
            >
              <Trophy size={28} weight="duotone" className="text-emerald-400" />
            </motion.div>
            <div>
              <h1 className="text-xl font-black tracking-widest text-white uppercase">FIFA TRANSIT</h1>
              <p className="text-[10px] text-zinc-500 tracking-widest uppercase">2026 WORLD CUP OPERATIONS</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <DemoModeButton />
            <UserMenu />
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="relative z-10 px-4 md:px-6 py-2 border-b border-white/5 bg-zinc-950/30 backdrop-blur-sm">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                icon={tab.icon}
                label={tab.label}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              />
            ))}
          </div>
        </nav>

        {/* Dashboard Content */}
        <div className="flex-1 p-4 md:p-6">
          <AnimatePresence mode="wait">
            {activeTab === "fan" ? (
              <motion.div
                key="fan"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <FanHub />
              </motion.div>
            ) : (
              <motion.div
                key="staff"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <StaffHub />
                </ProtectedRoute>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </ProtectedRoute>
  );
}

// Components
const tabs = [
  { id: "fan" as AppTab, icon: Users, label: "FAN HUB" },
  { id: "staff" as AppTab, icon: ShieldCheck, label: "STAFF HUB" },
];

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<Record<string, unknown>>;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 md:px-6 py-3 rounded-2xl text-[10px] md:text-[11px] font-black tracking-[0.15em] flex items-center gap-3 transition-all duration-300 ${
        active
          ? "text-white bg-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
      }`}
    >
      <span className={active ? "text-emerald-400 scale-110 transition-transform" : ""}>
        <Icon size={14} weight="bold" />
      </span>
      <span className="hidden sm:inline">{label}</span>
      {active && (
        <motion.div
          layoutId="activeTabGlow"
          className="absolute inset-0 rounded-2xl border border-emerald-500/30"
          initial={false}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-emerald-500/50 blur-md rounded-full" />
        </motion.div>
      )}
    </button>
  );
}

function StadiumBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[600px] bg-gradient-to-b from-emerald-500/5 via-zinc-950/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-[400px] bg-gradient-to-t from-amber-500/5 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[300px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[300px]" />
    </div>
  );
}