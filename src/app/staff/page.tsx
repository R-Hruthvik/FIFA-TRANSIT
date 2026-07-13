'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type GateStatus = 'low' | 'medium' | 'high';

interface Metrics {
  gateA: GateStatus;
  gateB: GateStatus;
  gateC: GateStatus;
  gateD: GateStatus;
}

const statusColors: Record<GateStatus, { fill: string; bg: string; border: string; text: string; label: string }> = {
  low: { fill: 'fill-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', label: 'Normal' },
  medium: { fill: 'fill-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', label: 'Monitor' },
  high: { fill: 'fill-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'Critical' },
};

const gateLabels: Record<string, string> = {
  gateA: 'Gate A',
  gateB: 'Gate B',
  gateC: 'Gate C',
  gateD: 'Gate D',
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Operational Telemetry</h1>
          <Badge variant="secondary" className="gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Auto-refreshing every 10s
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gate Congestion Map</CardTitle>
            <CardDescription>Real-time status of all stadium entry gates</CardDescription>
          </CardHeader>
          <CardContent>
            <svg viewBox="0 0 400 400" className="w-full max-w-md mx-auto">
              <rect x="0" y="0" width="190" height="190" className={`${statusColors[metrics.gateA].fill} ${statusColors[metrics.gateA].border}`} rx="8" />
              <text x="95" y="100" textAnchor="middle" className="fill-zinc-100 font-bold">Gate A</text>
              <text x="95" y="120" textAnchor="middle" className={`${statusColors[metrics.gateA].text} text-[10px]`}>{statusColors[metrics.gateA].label}</text>

              <rect x="210" y="0" width="190" height="190" className={`${statusColors[metrics.gateB].fill} ${statusColors[metrics.gateB].border}`} rx="8" />
              <text x="305" y="100" textAnchor="middle" className="fill-zinc-100 font-bold">Gate B</text>
              <text x="305" y="120" textAnchor="middle" className={`${statusColors[metrics.gateB].text} text-[10px]`}>{statusColors[metrics.gateB].label}</text>

              <rect x="0" y="210" width="190" height="190" className={`${statusColors[metrics.gateC].fill} ${statusColors[metrics.gateC].border}`} rx="8" />
              <text x="95" y="310" textAnchor="middle" className="fill-zinc-100 font-bold">Gate C</text>
              <text x="95" y="330" textAnchor="middle" className={`${statusColors[metrics.gateC].text} text-[10px]`}>{statusColors[metrics.gateC].label}</text>

              <rect x="210" y="210" width="190" height="190" className={`${statusColors[metrics.gateD].fill} ${statusColors[metrics.gateD].border}`} rx="8" />
              <text x="305" y="310" textAnchor="middle" className="fill-zinc-100 font-bold">Gate D</text>
              <text x="305" y="330" textAnchor="middle" className={`${statusColors[metrics.gateD].text} text-[10px]`}>{statusColors[metrics.gateD].label}</text>
            </svg>
          </CardContent>
        </Card>
      </div>

      <aside className="w-80 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tactical Recommendations</CardTitle>
            <CardDescription>Per-gate staffing guidance</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4 text-sm text-zinc-400">
              {(Object.entries(metrics) as [string, GateStatus][]).map(([gate, status]) => (
                <li key={gate} className={`p-3 rounded-lg border ${statusColors[status].bg} ${statusColors[status].border}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold uppercase text-zinc-200">{gateLabels[gate]}</span>
                    <Badge variant={status === 'high' ? 'destructive' : status === 'medium' ? 'secondary' : 'outline'}
                           className="text-[10px] px-1.5 py-0">
                      {statusColors[status].label}
                    </Badge>
                  </div>
                  <p className={`text-xs ${statusColors[status].text}`}>
                    {status === 'high' ? 'Deploy additional staff immediately.' :
                     status === 'medium' ? 'Monitor throughput closely.' : 'Flow normal.'}
                  </p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}
