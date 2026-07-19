"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkle, Warning, CheckCircle } from "@phosphor-icons/react";

interface RateLimitStats {
  tokensAvailable: number;
  capacity: number;
  lastRefill: number;
  usageLastMinute: number;
  requestsTotal: number;
  requestsFailed: number;
}

export function AiRateLimitMonitor() {
  const [stats, setStats] = useState<RateLimitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/admin/ai-stats");
        if (!res.ok) {
          if (res.status === 403 || res.status === 401) {
            setError("Admin access required");
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch stats");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Sparkle size={20} weight="duotone" className="text-violet-400" />
          <h2 className="text-[10px] font-black tracking-[0.2em] text-violet-400 uppercase italic">
            AI Rate Limit Monitor
          </h2>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  if (error || !stats) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Warning size={20} weight="duotone" className="text-red-400" />
          <h2 className="text-[10px] font-black tracking-[0.2em] text-red-400 uppercase italic">
            AI Rate Limit Monitor
          </h2>
        </div>
        <p className="text-xs text-zinc-400">{error || "Stats unavailable"}</p>
      </Card>
    );
  }

  const usagePercent = Math.round((stats.usageLastMinute / stats.capacity) * 100);
  const healthStatus = usagePercent < 50 ? "healthy" : usagePercent < 80 ? "warning" : "critical";

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Sparkle size={20} weight="duotone" className="text-violet-400" />
          <h2 className="text-[10px] font-black tracking-[0.2em] text-violet-400 uppercase italic">
            AI Rate Limit Monitor
          </h2>
        </div>
        <Badge
          variant={healthStatus === "healthy" ? "default" : healthStatus === "warning" ? "secondary" : "destructive"}
          className="text-[9px] font-mono tracking-wider"
        >
          {healthStatus === "healthy" && <CheckCircle size={12} weight="fill" className="mr-1" />}
          {healthStatus === "warning" && <Warning size={12} weight="fill" className="mr-1" />}
          {healthStatus.toUpperCase()}
        </Badge>
      </div>

      <div className="space-y-4">
        {/* Token Budget */}
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] text-zinc-400 uppercase tracking-wider">Token Budget (per minute)</span>
            <span className="text-xs font-mono text-violet-400">
              {stats.tokensAvailable} / {stats.capacity}
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                healthStatus === "healthy"
                  ? "bg-emerald-500"
                  : healthStatus === "warning"
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${100 - usagePercent}%` }}
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <p className="text-[9px] text-zinc-400 uppercase tracking-wider mb-1">Usage/min</p>
            <p className="text-lg font-black text-violet-400">{usagePercent}%</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-[9px] text-zinc-400 uppercase tracking-wider mb-1">Total Requests</p>
            <p className="text-lg font-black text-emerald-400">{stats.requestsTotal}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-[9px] text-zinc-400 uppercase tracking-wider mb-1">Failed</p>
            <p className="text-lg font-black text-red-400">{stats.requestsFailed}</p>
          </div>
        </div>

        {/* Recommendations */}
        {healthStatus !== "healthy" && (
          <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-900/40">
            <p className="text-[10px] text-amber-300 leading-relaxed">
              {healthStatus === "warning"
                ? "⚠️ Approaching rate limit. Consider reducing AI request frequency."
                : "🚨 Rate limit nearly exhausted. AI responses may be delayed or fall back to templates."}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
