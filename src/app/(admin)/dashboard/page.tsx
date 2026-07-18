"use client";

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Users, ShieldCheck, List, Settings, TrendingUp, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminStats {
  totalUsers: number;
  pendingStaff: number;
  activeStaff: number;
  adminCount: number;
}

interface OpsRun {
  runId?: string;
  recommendedAction?: string;
  targetGateId?: string | null;
  stewardCountToDeploy?: number;
  automatedSystemLog?: string;
  source?: string;
  createdAt?: string;
}

interface OpsDeployment {
  gateId?: string;
  stewards?: number;
  reason?: string;
  createdAt?: string;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [opsRun, setOpsRun] = useState<OpsRun | null>(null);
  const [opsDeployment, setOpsDeployment] = useState<OpsDeployment | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 403 || res.status === 401) {
        setError('Administrative clearance required to view this panel.');
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError('Failed to load dashboard statistics.');
      console.error('Failed to fetch admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOpsStatus = async () => {
    try {
      const res = await fetch('/api/admin/ops-status');
      if (!res.ok) return;
      const data = await res.json();
      setOpsRun(data.latestRun ?? null);
      setOpsDeployment(data.latestDeployment ?? null);
    } catch (err) {
      console.error('Failed to fetch ops status:', err);
    }
  };

  useEffect(() => {
    // Only admins trigger the background stats fetch — prevents fans/staff
    // from firing unauthorized cycles.
    if (status !== 'authenticated' || session?.user?.role !== 'admin') {
      setLoading(false);
      return;
    }
    fetchStats();
    fetchOpsStatus();
  }, [status, session?.user?.role]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-pulse bg-zinc-700 rounded-full w-12 h-12 mb-4"></div>
        <p className="text-zinc-400">Loading dashboard...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">{error ?? 'Failed to load dashboard statistics.'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">
        Admin Dashboard
      </h1>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-2xl shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-blue-500" />
                <h3 className="text-sm font-medium text-zinc-400">
                  Total Users
                </h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {stats.totalUsers}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-zinc-400">
              Total registered users
            </p>
          </CardContent>
        </Card>

        {/* Pending Staff */}
        <Card className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-2xl shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ShieldCheck className="h-5 w-5 text-yellow-500" />
                <h3 className="text-sm font-medium text-zinc-400">
                  Pending Staff
                </h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {stats.pendingStaff}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-zinc-400">
              Users awaiting staff approval
            </p>
          </CardContent>
        </Card>

        {/* Active Staff */}
        <Card className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-2xl shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <List className="h-5 w-5 text-green-500" />
                <h3 className="text-sm font-medium text-zinc-400">
                  Active Staff
                </h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {stats.activeStaff}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-zinc-400">
              Currently approved staff members
            </p>
          </CardContent>
        </Card>

        {/* Admin Count */}
        <Card className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-2xl shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                <h3 className="text-sm font-medium text-zinc-400">
                  Admin Count
                </h3>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {stats.adminCount}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-zinc-400">
              Total administrators
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Autonomous Operations Loop */}
      <Card className="bg-zinc-900/40 border border-emerald-800/30 backdrop-blur-md rounded-2xl shadow-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Activity className="h-5 w-5 text-emerald-500" />
              <h3 className="text-sm font-semibold text-white">
                Autonomous Operations Loop
              </h3>
            </div>
            <span className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active
            </span>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-sm text-zinc-400">
            Background AI agent is actively tracking gate densities and
            protecting stadium infrastructure safety thresholds.
          </p>

          {opsRun ? (
            <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-zinc-500">Last decision</span>
                <span className="text-xs font-black tracking-wider text-emerald-300 uppercase">
                  {opsRun.recommendedAction ?? 'NOMINAL'}
                </span>
              </div>
              {opsRun.targetGateId && (
                <p className="text-xs text-zinc-400 font-mono">
                  Target: {opsRun.targetGateId}
                  {typeof opsRun.stewardCountToDeploy === 'number' && opsRun.stewardCountToDeploy > 0
                    ? ` · ${opsRun.stewardCountToDeploy} stewards`
                    : ''}
                </p>
              )}
              {opsRun.automatedSystemLog && (
                <p className="text-xs text-zinc-400">{opsRun.automatedSystemLog}</p>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-mono text-zinc-600">
                  {opsRun.source ?? 'engine'}
                </span>
                {opsRun.createdAt && (
                  <span className="text-[10px] font-mono text-zinc-600">
                    {new Date(opsRun.createdAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-4">
              <p className="text-xs text-zinc-500 font-mono">
                No autonomous runs recorded yet. The agent will log its first
                decision on the next cycle.
              </p>
            </div>
          )}

          {opsDeployment && (
            <div className="rounded-xl border border-white/5 bg-zinc-950/40 p-4">
              <p className="text-xs font-mono text-zinc-500 mb-1">
                Latest steward deployment
              </p>
              <p className="text-xs text-zinc-300">
                {opsDeployment.stewards ?? 0} stewards → {opsDeployment.gateId ?? 'unknown'}
                {opsDeployment.createdAt
                  ? ` · ${new Date(opsDeployment.createdAt).toLocaleString()}`
                  : ''}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 sm:grid-cols-2">
        <Link href="/manage-staff" className="group">
          <Card className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-2xl shadow-xl hover:shadow-lg transition-shadow group-hover:shadow-xl">
            <CardContent className="p-6 text-center">
              <ShieldCheck className="h-10 w-10 mx-auto mb-4 text-yellow-500" />
              <h3 className="font-semibold text-white mb-2">
                Staff Approval Queue
              </h3>
              <p className="text-sm text-zinc-400 mb-4">
                Review and approve staff applications
              </p>
              <Button variant="outline" size="sm" className="border-zinc-800 text-zinc-300 hover:bg-zinc-800/60 hover:text-white">
                View Queue →
              </Button>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings" className="group">
          <Card className="bg-zinc-900/40 border border-white/5 backdrop-blur-md rounded-2xl shadow-xl hover:shadow-lg transition-shadow group-hover:shadow-xl">
            <CardContent className="p-6 text-center">
              <Settings className="h-10 w-10 mx-auto mb-4 text-zinc-400" />
              <h3 className="font-semibold text-white mb-2">
                Developer Settings
              </h3>
              <p className="text-sm text-zinc-400 mb-4">
                Configure feature flags and API settings
              </p>
              <Button variant="outline" size="sm" className="border-zinc-800 text-zinc-300 hover:bg-zinc-800/60 hover:text-white">
                Go to Settings →
              </Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
