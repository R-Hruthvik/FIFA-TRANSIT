"use client";

import { useState } from 'react';
import { SpatialHeatmap } from '@/components/SpatialHeatmap';
import { LiveQueryTicker } from '@/components/LiveQueryTicker';

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
      <div className="col-span-3 border border-slate-700 p-4">
        <SpatialHeatmap onGateClick={handleGateClick} />
      </div>
    </main>
  );
}
