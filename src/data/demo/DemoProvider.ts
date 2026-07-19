import type { GateMetrics, StadiumTelemetry } from "@/types/telemetry";
import type { Match } from "@/lib/match-api";
import type { IDataProvider, CrowdPosition, GateEvent, AdminLogEntry } from "@/data/types";
import { LiveDemoEngine } from "@/lib/live-demo-engine";

const GATE_ORDER = ["gate3", "gate2", "gate5", "gate1", "gate4", "gate6", "gate7", "gate8"];

function getHighestDensityGateFromMetrics(metrics: GateMetrics): string {
  for (const gate of GATE_ORDER) {
    if (metrics[gate as keyof GateMetrics] === "high") return gate;
  }
  return "gate1";
}

export class DemoProvider implements IDataProvider {
  readonly isDemo = true;
  elapsedMs = 0;
  private elapsedMsUpdateCallback: ((ms: number) => void) | null = null;

  private engine: LiveDemoEngine | null = null;

  private match: { match: Match | null; upcoming: Match[] } = {
    match: null,
    upcoming: [],
  };

  start(): void {
    if (this.engine) return;
    this.engine = new LiveDemoEngine();
    this.engine.start();
    
    if (this.engine) {
      this.elapsedMs = this.engine.getElapsed();
      this.engine.subscribe(() => {
        if (this.engine) {
          this.elapsedMs = this.engine.getElapsed();
        }
      });
    }
  }

  stop(): void {
    if (this.engine) {
      this.engine.stop();
      this.engine = null;
    }
  }

  private ensureEngine(): LiveDemoEngine {
    if (!this.engine) {
      this.engine = new LiveDemoEngine();
      this.engine.start();
      this.elapsedMs = this.engine.getElapsed();
      this.engine.subscribe(() => {
        if (this.engine) {
          this.elapsedMs = this.engine.getElapsed();
        }
      });
    }
    return this.engine;
  }

  getMatch(): { match: Match | null; upcoming: Match[] } {
    const engine = this.ensureEngine();
    const simState = engine.getMatchState();
    if (!simState) return { match: null, upcoming: [] };

    const status =
      simState.phase === "full-time"
        ? "finished"
        : simState.phase === "pre-match"
          ? "scheduled"
          : "live";

    this.match = {
      match: {
        id: "demo-match",
        homeTeam: "United States",
        awayTeam: "England",
        homeScore: simState.homeScore,
        awayScore: simState.awayScore,
        status,
        utcDate: new Date().toISOString(),
        minute: simState.minute,
        stadiumName: "MetLife Stadium — FIFA World Cup 26",
      },
      upcoming: [],
    };

    return this.match;
  }

  getTelemetry(): StadiumTelemetry | null {
    const engine = this.ensureEngine();
    return engine.getTelemetry();
  }

  getMetrics(): GateMetrics | null {
    const engine = this.ensureEngine();
    return engine.getMetrics();
  }

  getCrowdPositions(): CrowdPosition[] {
    const engine = this.ensureEngine();
    return engine.getCrowdPositions() as CrowdPosition[];
  }

  getCrowdCount(): number {
    const engine = this.ensureEngine();
    return engine.getCrowdCount();
  }

  getGateEvents(): GateEvent[] {
    const engine = this.ensureEngine();
    return engine.getGateEvents() as GateEvent[];
  }

  getRecentGateEvents(minutesAge: number): GateEvent[] {
    const engine = this.ensureEngine();
    return engine.getRecentGateEvents(minutesAge) as GateEvent[];
  }

  getAdminLogs(): AdminLogEntry[] {
    const engine = this.ensureEngine();
    return engine.getAdminLogs() as AdminLogEntry[];
  }

  getRecentAdminLogs(count: number): AdminLogEntry[] {
    const engine = this.ensureEngine();
    return engine.getRecentAdminLogs(count) as AdminLogEntry[];
  }

  getAiResponse(input: string, _context?: Record<string, any>): string {
    const engine = this.ensureEngine();
    const matchState = engine.getMatchState();
    const inputLower = input.toLowerCase();
    const metrics = engine.getMetrics();
    const highestGate = getHighestDensityGateFromMetrics(metrics);

    if (inputLower.includes("gate") || inputLower.includes("crowd") || inputLower.includes("security")) {
      return `Gate monitoring update: G1=${metrics.gate1}, G2=${metrics.gate2}, G3=${metrics.gate3}, G4=${metrics.gate4}, G5=${metrics.gate5}, G6=${metrics.gate6}, G7=${metrics.gate7}, G8=${metrics.gate8}. Highest congestion at ${highestGate}.`;
    }
    if (inputLower.includes("match") || inputLower.includes("score") || inputLower.includes("time")) {
      return `Match status at MetLife Stadium — FIFA World Cup 26: ${matchState.phase}, minute ${matchState.minute}, Score ${matchState.homeScore}-${matchState.awayScore}. ${matchState.phase === "half-time" ? "Crowd movement increasing through concourse." : matchState.phase === "full-time" ? "All gates actively managing exit flow." : "Crowd density stable at all gates."}`;
    }
    if (inputLower.includes("staff")) {
      return "Staff alert system active. All gates under surveillance. Gate alerts are being generated for any threshold breaches. Log entries being recorded to admin panel.";
    }
    return `Systems nominal. Current crowd: ${engine.getCrowdCount()} monitored individuals. Active gate alerts: ${engine.getGateEvents().length}. Match: ${matchState.homeScore}-${matchState.awayScore} (${matchState.phase}).`;
  }

  getFanQuery(): string | null {
    const queries = [
      "What's the crowd situation at Gate G3?",
      "Need shuttle schedule update",
      "Gate G2 is getting busy",
      "Security status at all gates",
      "Shuttle wait time at Main Hub?",
      "Are there any gate closures?",
      "Half-time crowd movement update",
      "Egress plan for Gate G5",
    ];
    const index = Math.floor(Math.random() * queries.length);
    return queries[index];
  }

  applyGateOverride(gate: string, status: "OPEN" | "CLOSED" | "LIMITED"): void {
    const engine = this.ensureEngine();
    engine.applyGateOverride(gate, status);
  }

  applyStewardDispatch(location: string, count: number): void {
    const engine = this.ensureEngine();
    engine.applyStewardDispatch(location, count);
  }

  applyIncidentReport(description: string, severity: string, location: string): void {
    const engine = this.ensureEngine();
    engine.applyIncidentReport(description, severity, location);
  }

  loadScenario(scenario: {
    title?: string;
    snapshots: Array<{
      t: number;
      gateDensities: Record<string, number>;
      alerts?: string[];
      fanQueries?: string[];
      thermal?: { hotspotGate: string; intensity: number };
    }>;
    broadcastMessage?: string;
  }): void {
    const engine = this.ensureEngine();
    engine.loadScenario(scenario);
  }
}
