"use client";

import { useState } from 'react';
import { LiveQueryTicker } from '@/components/LiveQueryTicker';
import { OperationalInsights } from '@/components/OperationalInsights';

const SpatialHeatmap = ({ onGateClick }: { onGateClick: (gate: string) => void }) => (
  <svg viewBox="0 0 200 200" className="w-full h-64 border border-slate-700 bg-zinc-900 cursor-pointer">
    <rect x="0" y="0" width="100" height="100" fill="#064e3b" onClick={() => onGateClick('Gate A')} />
    <rect x="100" y="0" width="100" height="100" fill="#7c2d12" onClick={() => onGateClick('Gate B')} />
    <rect x="0" y="100" width="100" height="100" fill="#991b1b" onClick={() => onGateClick('Gate C')} />
    <rect x="100" y="100" width="100" height="100" fill="#064e3b" onClick={() => onGateClick('Gate D')} />
    <text x="50" y="50" textAnchor="middle" fill="white">Gate A</text>
    <text x="150" y="50" textAnchor="middle" fill="white">Gate B</text>
    <text x="50" y="150" textAnchor="middle" fill="white">Gate C</text>
    <text x="150" y="150" textAnchor="middle" fill="white">Gate D</text>
  </svg>
);

export default function StaffDashboard() {
  const [gateFilter, setGateFilter] = useState<string | null>(null);

  const handleGateClick = (gate: string) => {
    setGateFilter(prev => prev === gate ? null : gate);
  };

  return (
    <main className="h-screen w-screen bg-zinc-950 text-slate-100 p-4 grid grid-cols-4 gap-4">
      <div className="col-span-1 border border-slate-700 p-4">
        <LiveQueryTicker gateFilter={gateFilter} />
      </div>
      <div className="col-span-3 grid grid-rows-[auto_auto] gap-4">
        <SpatialHeatmap onGateClick={handleGateClick} />
        <OperationalInsights />
      </div>
    </main>
  );
}
