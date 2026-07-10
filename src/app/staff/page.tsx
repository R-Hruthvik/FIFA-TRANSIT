'use client';

import { useState, useEffect } from 'react';

type GateStatus = 'low' | 'medium' | 'high';

interface Metrics {
  gateA: GateStatus;
  gateB: GateStatus;
  gateC: GateStatus;
  gateD: GateStatus;
}

const statusClasses = {
  low: 'fill-green-500 bg-green-500/10 border-green-500/30 text-green-400',
  medium: 'fill-orange-500 bg-orange-500/10 border-orange-500/30 text-orange-400',
  high: 'fill-red-500 bg-red-500/10 border-red-500/30 text-red-400',
};

export default function StaffDashboard() {
  const [metrics, setMetrics] = useState<Metrics>({
    gateA: 'low',
    gateB: 'low',
    gateC: 'low',
    gateD: 'low',
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/staff/metrics');
        const data = await res.json();
        setMetrics(data.metrics);
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex gap-6">
      <div className="flex-1 space-y-6">
        <h1 className="text-2xl font-bold">Operational Telemetry</h1>
        
        <div className="bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <svg viewBox="0 0 400 400" className="w-full max-w-md mx-auto">
            <rect x="0" y="0" width="190" height="190" className={`${statusClasses[metrics.gateA]} border`} rx="8" />
            <text x="95" y="100" textAnchor="middle" className="fill-zinc-100 font-bold">Gate A</text>
            
            <rect x="210" y="0" width="190" height="190" className={`${statusClasses[metrics.gateB]} border`} rx="8" />
            <text x="305" y="100" textAnchor="middle" className="fill-zinc-100 font-bold">Gate B</text>
            
            <rect x="0" y="210" width="190" height="190" className={`${statusClasses[metrics.gateC]} border`} rx="8" />
            <text x="95" y="310" textAnchor="middle" className="fill-zinc-100 font-bold">Gate C</text>
            
            <rect x="210" y="210" width="190" height="190" className={`${statusClasses[metrics.gateD]} border`} rx="8" />
            <text x="305" y="310" textAnchor="middle" className="fill-zinc-100 font-bold">Gate D</text>
          </svg>
        </div>
      </div>

      <aside className="w-80 bg-zinc-900 p-6 rounded-lg border border-zinc-800">
        <h2 className="text-xl font-bold mb-4">Tactical Recommendations</h2>
        <ul className="space-y-4 text-sm text-zinc-400">
          {Object.entries(metrics).map(([gate, status]) => (
            <li key={gate} className={`p-3 rounded border ${statusClasses[status]}`}>
              <span className="font-bold uppercase">{gate}:</span>{' '}
              {status === 'high' ? 'Deploy additional staff immediately.' : 
               status === 'medium' ? 'Monitor throughput closely.' : 'Flow normal.'}
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}
