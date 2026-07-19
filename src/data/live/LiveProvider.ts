import type { GateMetrics, StadiumTelemetry } from "@/types/telemetry";
import type { Match } from "@/lib/match-api";
import type { IDataProvider, CrowdPosition, GateEvent, AdminLogEntry } from "@/data/types";

export class LiveProvider implements IDataProvider {
  readonly isDemo = false;
  elapsedMs = 0;

  private matchCache: { match: Match | null; upcoming: Match[] } = { match: null, upcoming: [] };
  private telemetryCache: StadiumTelemetry | null = null;
  private metricsCache: GateMetrics | null = null;
  private crowdCountCache = 0;
  private gateEventsCache: GateEvent[] = [];
  private adminLogsCache: AdminLogEntry[] = [];

  private pollIntervals: ReturnType<typeof setInterval>[] = [];

  start(): void {
    this.pollIntervals.push(setInterval(() => this.fetchMatch(), 30000));
    this.pollIntervals.push(setInterval(() => this.fetchTelemetry(), 30000));
    this.pollIntervals.push(setInterval(() => this.fetchMetrics(), 30000));
    this.pollIntervals.push(setInterval(() => this.fetchCrowdCount(), 10000));
    this.pollIntervals.push(setInterval(() => this.fetchGateEvents(), 15000));
    this.pollIntervals.push(setInterval(() => this.fetchAdminLogs(), 20000));

    this.fetchMatch();
    this.fetchTelemetry();
    this.fetchMetrics();
    this.fetchCrowdCount();
    this.fetchGateEvents();
    this.fetchAdminLogs();
  }

  stop(): void {
    for (const interval of this.pollIntervals) {
      clearInterval(interval);
    }
    this.pollIntervals = [];
  }

  private async fetchMatch(): Promise<void> {
    try {
      const [resMatches, resSchedule] = await Promise.all([
        fetch("/api/match"),
        fetch("/api/match/schedule"),
      ]);
      if (resMatches.ok && resSchedule.ok) {
        const [dataMatches, dataSchedule] = await Promise.all([
          resMatches.json(),
          resSchedule.json(),
        ]);
        const allMatches: Match[] = dataMatches.matches || [];
        const scheduled: Match[] = dataSchedule.schedule || [];
        const live = allMatches.find((m) => m.status === "live");
        this.matchCache = {
          match: live || allMatches[0] || null,
          upcoming: scheduled,
        };
      }
    } catch {
      // Silently fail — use stale cache
    }
  }

  private async fetchTelemetry(): Promise<void> {
    try {
      const res = await fetch("/api/telemetry");
      if (res.ok) {
        const data = await res.json();
        if (data && data.nearestGate && data.nearestHub && data.weatherAdvisory) {
          this.telemetryCache = data;
        }
      }
    } catch {
      // Silently fail
    }
  }

  private async fetchMetrics(): Promise<void> {
    try {
      const res = await fetch("/api/staff/metrics");
      if (res.ok) {
        const data = await res.json();
        if (data.metrics) this.metricsCache = data.metrics;
      }
    } catch {
      // Silently fail
    }
  }

  private async fetchCrowdCount(): Promise<void> {
    try {
      const res = await fetch("/api/track/crowd");
      if (res.ok) {
        const data = await res.json();
        if (typeof data.count === "number") this.crowdCountCache = data.count;
      }
    } catch {
      // Silently fail
    }
  }

  private async fetchGateEvents(): Promise<void> {
    try {
      const res = await fetch("/api/track/staff");
      if (res.ok) {
        const data = await res.json();
        if (data.alerts) {
          const mapped: GateEvent[] = (data.alerts as any[]).map((a: any) => ({
            timestamp: a.timestamp || Date.now(),
            gate: a.gateId || "unknown",
            type: (a.type || "alert") as "entry" | "exit" | "alert",
            crowdCount: a.count,
            message: a.message || `Alert at ${a.gateId || "unknown"}`,
          }));
          this.gateEventsCache = mapped;
        }
      }
    } catch {
      // Silently fail
    }
  }

  private async fetchAdminLogs(): Promise<void> {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.logs)) {
          this.adminLogsCache = data.logs as AdminLogEntry[];
        }
      }
    } catch {
      // Silently fail
    }
  }

  getMatch(): { match: Match | null; upcoming: Match[] } {
    return this.matchCache;
  }

  getTelemetry(): StadiumTelemetry | null {
    return this.telemetryCache;
  }

  getMetrics(): GateMetrics | null {
    return this.metricsCache;
  }

  getCrowdPositions(): CrowdPosition[] {
    return [];
  }

  getCrowdCount(): number {
    return this.crowdCountCache;
  }

  getGateEvents(): GateEvent[] {
    return this.gateEventsCache;
  }

  getRecentGateEvents(minutesAge: number): GateEvent[] {
    const cutoff = Date.now() - minutesAge * 60 * 1000;
    return this.gateEventsCache.filter((e) => e.timestamp >= cutoff);
  }

  getAdminLogs(): AdminLogEntry[] {
    return this.adminLogsCache;
  }

  getRecentAdminLogs(count: number): AdminLogEntry[] {
    return this.adminLogsCache.slice(-count);
  }

  getAiResponse(_input: string, _context?: Record<string, any>): string {
    return "";
  }

  getFanQuery(): string | null {
    return null;
  }

  applyGateOverride(_gate: string, _status: "OPEN" | "CLOSED" | "LIMITED"): void {
    // Handled server-side via /api/staff/chat
  }

  applyStewardDispatch(_location: string, _count: number): void {
    // Handled server-side via /api/staff/chat
  }

  applyIncidentReport(_description: string, _severity: string, _location: string): void {
    // Handled server-side via /api/staff/chat
  }
}
