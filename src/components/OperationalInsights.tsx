"use client";

import { motion } from "motion/react";
import { CheckCircle, ArrowRight, ShieldCheck, Target } from "@phosphor-icons/react";

export const OperationalInsights = () => {
  const insights = [
    {
      id: 1,
      type: "action",
      title: "Reserve Deployment",
      content: "Deploy reserve security team to Gate C to handle peak load.",
      severity: "high",
      icon: <ShieldCheck size={20} weight="duotone" />
    },
    {
      id: 2,
      type: "optimization",
      title: "Auxiliary Entry",
      content: "Open auxiliary turnstiles at Gate A for next 30 minutes.",
      severity: "medium",
      icon: <Target size={20} weight="duotone" />
    },
    {
      id: 3,
      type: "success",
      title: "Flow Optimized",
      content: "Main Hub transit wait time stabilized at 8 minutes.",
      severity: "low",
      icon: <CheckCircle size={20} weight="duotone" />
    }
  ];

  return (
    <div className="space-y-4">
      {insights.map((insight, i) => (
        <motion.div
          key={insight.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          whileHover={{ x: 4 }}
          className="group p-4 rounded-xl bg-zinc-900/40 backdrop-blur-md border border-zinc-800/80 hover:border-amber-500/30 transition-all cursor-default"
        >
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-lg ${
              insight.severity === 'high' ? 'text-rose-400 bg-rose-500/10' :
              insight.severity === 'medium' ? 'text-amber-400 bg-amber-500/10' :
              'text-emerald-400 bg-emerald-500/10'
            }`}>
              {insight.icon}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-[11px] font-black tracking-widest text-white uppercase italic">
                  {insight.title}
                </h4>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  insight.severity === 'high' ? 'bg-rose-500 animate-pulse' :
                  insight.severity === 'medium' ? 'bg-amber-500' :
                  'bg-emerald-500'
                }`} />
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed font-medium tracking-wide">
                {insight.content}
              </p>
            </div>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center text-amber-400">
              <ArrowRight size={16} weight="bold" />
            </div>
          </div>
        </motion.div>
      ))}

      {/* Action CTA */}
      <button className="w-full mt-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black tracking-[0.2em] uppercase hover:bg-amber-500 hover:text-black transition-all">
        VIEW FULL TACTICAL LOG
      </button>
    </div>
  );
};
