"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, X, Trophy } from "@phosphor-icons/react";

const STORAGE_KEY = "fifa-walkthrough-completed";

interface Step {
  id: string;
  title: string;
  description: string;
  highlight: string; // CSS selector to highlight
  position: "top" | "bottom" | "left" | "right";
}

const STEPS: Step[] = [
  {
    id: "welcome",
    title: "Welcome to FIFA Command Center",
    description: "Real-time stadium intelligence for the 2026 World Cup. Monitor gates, assist fans, and respond to incidents — all from one screen.",
    highlight: "h1",
    position: "bottom",
  },
  {
    id: "fan-portal",
    title: "Fan Portal",
    description: "Live status cards show gate conditions, transit wait times, and weather. The AI assistant answers fan questions instantly.",
    highlight: '[data-tab="fan"]',
    position: "bottom",
  },
  {
    id: "staff-deck",
    title: "Staff Operations Deck",
    description: "Switch to the Staff view for gate performance metrics, spatial heatmap, and tactical AI insights.",
    highlight: '[data-tab="staff"]',
    position: "bottom",
  },
  {
    id: "ai-copilot",
    title: "AI Copilot",
    description: "Ask anything about tournament logistics. The AI uses live telemetry to give real-time guidance.",
    highlight: '[data-section="ai-chat"]',
    position: "left",
  },
  {
    id: "heatmap",
    title: "Spatial Congestion Heatmap",
    description: "Visual gate monitoring with 3 switchable views. Click any gate to filter the live query stream.",
    highlight: '[data-section="heatmap"]',
    position: "bottom",
  },
];

export function GuidedWalkthrough() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return !!localStorage.getItem(STORAGE_KEY);
    } catch {
      return false;
    }
  });

  // Show walkthrough after a short delay (only if not completed)
  useEffect(() => {
    if (isCompleted) return;
    const timer = setTimeout(() => setIsVisible(true), 800);
    return () => clearTimeout(timer);
  }, [isCompleted]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    setIsVisible(false);
    setIsCompleted(true);
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {}
  };

  if (isCompleted || !isVisible) return null;

  const step = STEPS[currentStep];

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleComplete}
          />

          {/* Tooltip */}
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed z-50 w-80 p-6 rounded-2xl bg-zinc-900 border border-zinc-700/50 shadow-2xl shadow-black/80"
            style={{
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Step indicator */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                  <Trophy size={14} weight="duotone" className="text-emerald-400" />
                </div>
                <span className="text-[9px] font-black tracking-[0.2em] text-zinc-500 uppercase">
                  Step {currentStep + 1} of {STEPS.length}
                </span>
              </div>
              <button
                onClick={handleComplete}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={16} weight="bold" />
              </button>
            </div>

            {/* Content */}
            <h3 className="text-sm font-black text-white mb-2 tracking-wide">
              {step.title}
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              {step.description}
            </p>

            {/* Progress dots */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-all ${
                      i === currentStep
                        ? "bg-emerald-500 w-4"
                        : i < currentStep
                        ? "bg-emerald-500/40"
                        : "bg-zinc-700"
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleComplete}
                  className="px-3 py-1.5 text-[10px] font-black tracking-widest text-zinc-500 hover:text-white transition-colors uppercase"
                >
                  Skip
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black tracking-widest uppercase transition-all"
                >
                  {currentStep < STEPS.length - 1 ? (
                    <>
                      Next
                      <ArrowRight size={12} weight="bold" />
                    </>
                  ) : (
                    "Start"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
