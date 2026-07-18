"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Trophy, ShieldCheck, Users } from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import FanHub from "@/components/FanHub";
import StaffHub from "@/components/StaffHub";
import { AsciiAvatar } from "@/components/AsciiAvatar";
import { DemoModeButton } from "@/components/DemoController";
import { AppTab } from "@/types/telemetry";
import { UserMenu } from "@/components/auth/UserMenu";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { useMatchData } from "@/hooks/useMatchData";
import { MatchSchedule } from "@/components/match/MatchSchedule";

const ALLOWED_ROLES: ("fan" | "staff" | "admin")[] = ["fan", "staff", "admin"];

export default function Page() {
  const { data: session, status } = useSession();
  const { upcomingMatches, loading: matchesLoading, isMock } = useMatchData();
  const [activeTab, setActiveTab] = useState<AppTab>("fan");

  useEffect(() => {
    if (session?.user) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [session, activeTab]);

  const isLoading = matchesLoading || status === "loading";

  if (isLoading) {
    return (
      <main className="min-h-screen w-full overflow-y-auto flex flex-col bg-zinc-950 text-zinc-100 font-mono antialiased relative">
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            <p className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase italic">
              {matchesLoading ? "Loading Match Data..." : "Loading..."}
            </p>
            {isMock && !matchesLoading && (
              <p className="text-[9px] text-amber-500/70 font-mono">No API key configured — showing placeholder match data</p>
            )}
          </div>
        </div>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="min-h-screen w-full overflow-y-auto flex flex-col bg-zinc-950 text-zinc-100 font-mono antialiased relative">
        <header className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-600/20 rounded-xl border border-emerald-500/30">
              <Trophy size={24} weight="duotone" className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-widest text-white uppercase">StadiumFlow</h1>
              <p className="text-[8px] text-zinc-500 tracking-widest uppercase">2026 WORLD CUP</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/staff/register" className="text-xs font-bold text-zinc-400 hover:text-white transition-colors uppercase tracking-wider">
              Staff Access
            </Link>
            <Button
              onClick={() => signIn(undefined, { callbackUrl: "/" })}
              variant="outline"
              className="border-zinc-800 text-xs font-bold uppercase tracking-wider hover:bg-zinc-900"
            >
              Sign In
            </Button>
          </div>
        </header>

        <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-16 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 space-y-6 text-left">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-[10px] tracking-widest uppercase px-3 py-1 font-bold">
              Operational Command System
            </Badge>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white uppercase italic leading-none">
              STADIUMFLOW:<br />
              <span className="text-emerald-400">
                Tournament Command System
              </span>
            </h1>
            <p className="text-zinc-400 text-base md:text-lg leading-relaxed font-light tracking-wide max-w-xl">
              Real-time CrowdPulse telemetry, spatial congestion analysis, and Matchday Mate AI-powered guidance for 2026 matchday operations.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Button
                onClick={() => signIn(undefined, { callbackUrl: "/" })}
                className="px-8 py-6 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl tracking-widest uppercase transition-all"
              >
                Enter Portal
              </Button>
              <Button
                asChild
                variant="outline"
                className="px-8 py-6 border-zinc-800 text-zinc-300 hover:bg-zinc-900/60 font-black rounded-xl tracking-widest uppercase"
              >
                <Link href="/staff/register">Register as Staff</Link>
              </Button>
            </div>
          </div>

          <div className="flex-1 w-full max-w-md">
            <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-3xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase italic">Live CrowdPulse</span>
                </div>
                <Badge className="bg-zinc-800 text-zinc-400 text-[8px] font-mono border-none">PREVIEW</Badge>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-zinc-950/40 rounded-2xl border border-zinc-800 space-y-1">
                  <span className="text-[8px] text-zinc-500 font-mono block">NEAREST GATE</span>
                  <span className="text-[10px] font-bold text-zinc-300 block truncate">—</span>
                  <Badge className="bg-zinc-700/30 text-zinc-500 text-[8px] border-none px-1.5 py-0">AWAITING</Badge>
                </div>
                <div className="p-3 bg-zinc-950/40 rounded-2xl border border-zinc-800 space-y-1">
                  <span className="text-[8px] text-zinc-500 font-mono block">MAIN HUB WAIT</span>
                  <span className="text-[10px] font-bold text-zinc-300 block">—</span>
                  <span className="text-[8px] text-zinc-500 block font-medium">Live sync</span>
                </div>
                <div className="p-3 bg-zinc-950/40 rounded-2xl border border-zinc-800 space-y-1">
                  <span className="text-[8px] text-zinc-500 font-mono block">WEATHER COND</span>
                  <span className="text-[10px] font-bold text-zinc-300 block">—</span>
                  <span className="text-[8px] text-zinc-500 block font-semibold">Connecting</span>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex gap-3 items-start">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                    <Users size={16} weight="duotone" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-white tracking-wide uppercase">FanAssist</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Calculates optimal egress routes and caches them directly on-device for offline transit guidance.</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                    <ShieldCheck size={16} weight="duotone" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-white tracking-wide uppercase">Tactical Command Hub</h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Enables stadium security staff to monitor crowd congestion heatmaps and orchestrate safe routing.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto w-full px-6 py-12 border-t border-zinc-800 bg-zinc-950">
          <h2 className="text-xs font-black tracking-[0.2em] text-zinc-500 uppercase italic mb-6">
            Upcoming Tournament Fixtures
          </h2>
          <MatchSchedule matches={upcomingMatches} />
        </div>

        <footer className="py-8 border-t border-zinc-800 text-center text-zinc-500 text-xs">
          <p>© 2026 StadiumFlow Transit Management. All rights reserved.</p>
        </footer>
      </main>
    );
  }

  const userRole = session?.user?.role;

  const visibleTabs = tabs.filter(tab => {
    if (tab.id === "staff") return userRole === "staff" || userRole === "admin";
    return true;
  });

  return (
    <ProtectedRoute allowedRoles={ALLOWED_ROLES}>
      <main className="min-h-screen w-full overflow-y-auto flex flex-col bg-zinc-950 text-zinc-100 font-mono antialiased relative">
        <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-emerald-600/20 rounded-xl border border-emerald-500/30">
              <Trophy size={28} weight="duotone" className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-widest text-white uppercase">StadiumFlow</h1>
              <p className="text-[10px] text-zinc-500 tracking-widest uppercase">2026 WORLD CUP OPERATIONS</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {session?.user?.role === "admin" && <DemoModeButton />}
            <UserMenu />
          </div>
        </header>

        <div className="px-4 md:px-6 py-4">
          <div className="max-w-md mx-auto">
            <AsciiAvatar
              persona={userRole === "admin" || userRole === "staff" ? "torque" : "miri"}
              state="idle"
            />
          </div>
        </div>

        {visibleTabs.length > 1 && (
          <nav className="px-4 md:px-6 py-2 border-b border-zinc-800 bg-zinc-950">
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {visibleTabs.map((tab) => (
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
        )}

        <div className="flex-1 p-4 md:p-6">
          {activeTab === "fan" ? (
            <FanHub key="fan" />
          ) : (
            <ProtectedRoute allowedRoles={["staff", "admin"]}>
              <StaffHub key="staff" />
            </ProtectedRoute>
          )}
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