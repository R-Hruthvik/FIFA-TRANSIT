"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, ShieldCheck, Users, Command, UserCircle } from "@phosphor-icons/react";
import FanHub from "@/components/FanHub";
import StaffHub from "@/components/StaffHub";
import { DemoModeButton } from "@/components/DemoController";
import { AppTab } from "@/types/telemetry";

export default function Page() {
  const [showHero, setShowHero] = useState(true);
  const [activeTab, setActiveTab] = useState<AppTab>('fan');

  return (
    <main className="min-h-screen w-full overflow-y-auto flex flex-col bg-gradient-to-br from-zinc-950 via-[#01170f] to-zinc-950 text-white font-sans selection:bg-emerald-500/30 relative">
      <StadiumBackground />

      <AnimatePresence mode="wait">
        {showHero ? (
          <HeroSection onEnter={() => setShowHero(false)} />
        ) : (
          <DashboardContent
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
      </AnimatePresence>
    </main>
  );
}

function StadiumBackground() {
  return (
    <>
      <div className="fixed inset-0 opacity-[0.05] pointer-events-none z-0" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 86c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm66 3c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm-46-45c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zm10-41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")` }} />
      <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-emerald-900/10 blur-[120px] rounded-full pointer-events-none" />
    </>
  );
}

function HeroSection({ onEnter }: { onEnter: () => void }) {
  return (
    <motion.section
      key="hero"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
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

      <motion.button
        whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(16,185,129,0.4)" }}
        whileTap={{ scale: 0.95 }}
        onClick={onEnter}
        className="group relative px-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl overflow-hidden transition-all duration-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
      >
        <span className="relative z-10 flex items-center gap-3 tracking-[0.2em] text-sm">
          ENTER COMMAND CENTER
          <Command size={20} weight="bold" />
        </span>
        <motion.div
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        />
        <div className="absolute inset-0 rounded-2xl border border-white/20 group-hover:border-white/40 transition-colors" />
      </motion.button>
    </motion.section>
  );
}

function DashboardContent({ activeTab, onTabChange }: { activeTab: AppTab, onTabChange: (t: AppTab) => void }) {
  return (
    <motion.div
      key="dashboard"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative z-20 min-h-screen flex flex-col"
    >
      <header className="relative w-full flex justify-between items-center z-50 pt-6 px-4 mb-6 max-w-7xl mx-auto">
        <nav className="bg-zinc-900/40 backdrop-blur-2xl border border-zinc-800/80 p-2 rounded-3xl flex items-center justify-between shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] w-full">
          <div className="flex gap-2">
            <TabTrigger
              active={activeTab === 'fan'}
              onClick={() => onTabChange('fan')}
              label="FAN EGRESS PORTAL"
              icon={<Users size={20} weight="duotone" />}
            />
            <TabTrigger
              active={activeTab === 'staff'}
              onClick={() => onTabChange('staff')}
              label="STAFF OPS DECK"
              icon={<ShieldCheck size={20} weight="duotone" />}
            />
          </div>

          <div className="hidden lg:flex items-center gap-6 px-8 border-x border-zinc-800/50">
            <div className="flex flex-col items-center">
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">Match Day 24</span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black italic">USA</span>
                <div className="flex items-center gap-1.5 bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-800">
                  <span className="text-xs font-black text-emerald-400">2</span>
                  <span className="text-[10px] font-bold text-zinc-600">:</span>
                  <span className="text-xs font-black text-zinc-400">1</span>
                </div>
                <span className="text-xs font-black italic text-zinc-500">MEX</span>
              </div>
            </div>
            <div className="w-px h-8 bg-zinc-800/50" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1 animate-pulse">88&apos; LIVE</span>
              <span className="text-[10px] font-bold text-white tracking-tight italic">+4 MIN STOPPAGE</span>
            </div>
          </div>

          <div className="flex items-center gap-4 pr-2">
            <DemoModeButton />
            <div className="hidden md:block text-right">
              <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">System Status</p>
              <p className="text-[10px] font-medium text-emerald-400 flex items-center gap-1 justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                OPERATIONAL
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onTabChange(activeTab === 'fan' ? 'staff' : 'fan')}
              className="w-10 h-10 rounded-2xl bg-zinc-800/50 flex items-center justify-center text-emerald-400 border border-white/5 hover:border-emerald-500/50 transition-colors"
            >
              <UserCircle size={24} weight="duotone" />
            </motion.button>
          </div>
        </nav>
      </header>

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: activeTab === 'fan' ? -20 : 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: activeTab === 'fan' ? 20 : -20, filter: "blur(10px)" }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="w-full"
          >
            {activeTab === 'fan' ? <FanHub /> : <StaffHub />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

interface TabTriggerProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}

function TabTrigger({ active, onClick, label, icon }: TabTriggerProps) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 md:px-6 py-3 rounded-2xl text-[10px] md:text-[11px] font-black tracking-[0.15em] flex items-center gap-3 transition-all duration-300 ${
        active
          ? 'text-white bg-white/5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
      }`}
    >
      <span className={active ? 'text-emerald-400 scale-110 transition-transform' : ''}>
        {icon}
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
