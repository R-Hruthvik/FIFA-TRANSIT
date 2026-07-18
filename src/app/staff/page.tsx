'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

type GateStatus = 'low' | 'medium' | 'high';

interface Metrics {
  gate1: GateStatus;
  gate2: GateStatus;
  gate3: GateStatus;
  gate4: GateStatus;
  gate5: GateStatus;
  gate6: GateStatus;
  gate7: GateStatus;
  gate8: GateStatus;
}

const statusColors: Record<GateStatus, { fill: string; bg: string; border: string; text: string; label: string }> = {
  low: { fill: 'fill-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', label: 'Normal' },
  medium: { fill: 'fill-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', label: 'Monitor' },
  high: { fill: 'fill-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'Critical' },
};

const gateLabels: Record<string, string> = {
  gate1: 'Gate G1',
  gate2: 'Gate G2',
  gate3: 'Gate G3',
  gate4: 'Gate G4',
  gate5: 'Gate G5',
  gate6: 'Gate G6',
  gate7: 'Gate G7',
  gate8: 'Gate G8',
};

function StaffDashboardContent() {
  const [metrics, setMetrics] = useState<Metrics>({
    gate1: 'low',
    gate2: 'low',
    gate3: 'low',
    gate4: 'low',
    gate5: 'low',
    gate6: 'low',
    gate7: 'low',
    gate8: 'low',
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/staff/metrics');
        const data = await res.json();
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 flex flex-col lg:flex-row gap-6">
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
            <CardTitle>Gate Congestion Grid</CardTitle>
            <CardDescription>Real-time status of all 8 stadium entry gates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(metrics).map(([gate, status]) => {
                const s = status as GateStatus;
                return (
                  <div
                    key={gate}
                    className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${
                      statusColors[s].bg
                    } ${statusColors[s].border}`}
                  >
                    <span className="text-sm font-bold text-zinc-100">{gateLabels[gate]}</span>
                    <Badge
                      variant={s === 'high' ? 'destructive' : s === 'medium' ? 'secondary' : 'outline'}
                      className="mt-2 text-[10px] px-1.5 py-0 uppercase"
                    >
                      {statusColors[s].label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <aside className="w-full lg:w-80 space-y-6">
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

export default function StaffDashboard() {
  return (
    <ProtectedRoute allowedRoles={["staff", "admin"]}>
      <StaffDashboardContent />
    </ProtectedRoute>
  );
}