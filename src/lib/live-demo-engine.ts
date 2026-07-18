"use client";

import { GateMetrics, StadiumTelemetry } from "@/types/telemetry";

// Crowd position interface for live simulation
export interface CrowdPosition {
  id: string;
  gate: string;
  x: number;
  y: number;
  timestamp: number;
  isExiting: boolean;
}

// Gate event for staff notifications
export interface GateEvent {
  timestamp: number;
  gate: string;
  type: "entry" | "exit" | "alert";
  crowdCount?: number;
  message: string;
}

// Admin log entry
export interface AdminLogEntry {
  timestamp: number;
  level: "info" | "warning" | "alert";
  category: "crowd" | "gate" | "system";
  message: string;
  data?: Record<string, any>;
}

// Match simulation state
export interface MatchSimulationState {
  minute: number;
  half: 1 | 2;
  homeScore: number;
  awayScore: number;
  phase: "pre-match" | "first-half" | "half-time" | "second-half" | "full-time";
}

export class LiveDemoEngine {
  private crowdPositions: CrowdPosition[] = [];
  private gateEvents: GateEvent[] = [];
  private adminLogs: AdminLogEntry[] = [];
  private timeElapsedMs = 0;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private listeners: Array<() => void> = [];
  private crowdIdCounter = 0;

  // Crowd simulation density per gate (0-1)
  private gateDensities: Record<string, number> = {
    gate1: 0.2, gate2: 0.4, gate3: 0.8, gate4: 0.3,
    gate5: 0.1, gate6: 0.2, gate7: 0.3, gate8: 0.25,
  };

  // Gate SVG coordinates for heatmap (matching StadiumMap.tsx)
  private gateCoordinates: Record<string, { x: number; y: number }> = {
    gate1: { x: 200, y: 35 },
    gate2: { x: 345, y: 80 },
    gate3: { x: 370, y: 200 },
    gate4: { x: 345, y: 320 },
    gate5: { x: 200, y: 365 },
    gate6: { x: 55, y: 320 },
    gate7: { x: 30, y: 200 },
    gate8: { x: 55, y: 80 },
  };

  // Match simulation
  private matchState: MatchSimulationState = {
    minute: 0,
    half: 1,
    homeScore: 0,
    awayScore: 0,
    phase: "pre-match",
  };

  private lastMatchEventMinute = 0;
  private hasMatchStarted = false;

  // Gate event generation state
  private lastGateEventGates: Record<string, number> = {};

  // Track connected users (simulated real users)
  private realUserCount = 0;

  constructor() {
    // Initialize with some crowd positions
    this.initializeCrowd(150);
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private initializeCrowd(count: number) {
    const gates = Object.keys(this.gateCoordinates);
    for (let i = 0; i < count; i++) {
      const gate = gates[Math.floor(Math.random() * gates.length)];
      const coords = this.gateCoordinates[gate];
      // Scatter around gate with noise
      const cx = coords.x + (Math.random() - 0.5) * 40;
      const cy = coords.y + (Math.random() - 0.5) * 40;
      this.crowdPositions.push({
        id: `crowd-${this.crowdIdCounter++}`,
        gate,
        x: cx,
        y: cy,
        timestamp: Date.now(),
        isExiting: Math.random() < 0.1,
      });
    }
  }

  setRealUserCount(count: number) {
    this.realUserCount = count;
  }

  getCrowdPositions(): CrowdPosition[] {
    // Include real users in positions — return combined set
    return this.crowdPositions;
  }

  getCrowdCount(): number {
    return this.crowdPositions.length + this.realUserCount;
  }

  getGateEvents(): GateEvent[] {
    return this.gateEvents.slice(-50); // Last 50 events
  }

  getRecentGateEvents(minutesAge: number): GateEvent[] {
    const cutoff = Date.now() - minutesAge * 60 * 1000;
    return this.gateEvents.filter((e) => e.timestamp >= cutoff);
  }

  getAdminLogs(): AdminLogEntry[] {
    return this.adminLogs;
  }

  getRecentAdminLogs(count: number): AdminLogEntry[] {
    return this.adminLogs.slice(-count);
  }

  getMatchState(): MatchSimulationState {
    return this.matchState;
  }

  getMetrics(): GateMetrics {
    return {
      gate1: this.densityToStatus("gate1"),
      gate2: this.densityToStatus("gate2"),
      gate3: this.densityToStatus("gate3"),
      gate4: this.densityToStatus("gate4"),
      gate5: this.densityToStatus("gate5"),
      gate6: this.densityToStatus("gate6"),
      gate7: this.densityToStatus("gate7"),
      gate8: this.densityToStatus("gate8"),
    };
  }

  getTelemetry(): StadiumTelemetry {
    const total = this.getCrowdCount();
    const highestGate = this.getHighestDensityGate();
    const highestStatus = this.densityToStatus(highestGate);
    return {
      gateMetrics: this.getMetrics(),
      crowdCount: total,
      gateEvents: this.gateEvents.slice(-5),
      matchState: this.matchState,
      adminLogs: this.adminLogs.slice(-5),
      nearestGate: {
        label: `Gate ${highestGate.slice(-1).toUpperCase()}`,
        status: highestStatus === "high" ? "congested" : highestStatus === "medium" ? "busy" : "open",
      },
      nearestHub: {
        label: "Main Hub",
        waitTime: Math.round(5 + total * 0.02),
      },
      weatherAdvisory: {
        label: "Clear",
        condition: "clear",
      },
    };
  }

  private getHighestDensityGate(): string {
    let maxDensity = 0;
    let maxGate = "gate1";
    for (const [gate, density] of Object.entries(this.gateDensities)) {
      if (density > maxDensity) {
        maxDensity = density;
        maxGate = gate;
      }
    }
    return maxGate;
  }

  private densityToStatus(gate: string): "low" | "medium" | "high" {
    const density = this.gateDensities[gate] || 0;
    if (density >= 0.65) return "high";
    if (density >= 0.35) return "medium";
    return "low";
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.intervalId = setInterval(() => this.tick(), 1000);
    this.log("info", "system", "Demo simulation started — all systems operational");
    this.log("info", "crowd", "Initial crowd detected — monitoring all gates");
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.log("info", "system", "Demo simulation stopped");
    this.notify();
  }

  getElapsed(): number {
    return this.timeElapsedMs;
  }

  isActive(): boolean {
    return this.isRunning;
  }

  reset() {
    this.crowdPositions = [];
    this.gateEvents = [];
    this.adminLogs = [];
    this.timeElapsedMs = 0;
    this.matchState = {
      minute: 0, half: 1, homeScore: 0, awayScore: 0, phase: "pre-match",
    };
    this.lastMatchEventMinute = 0;
    this.hasMatchStarted = false;
    this.crowdIdCounter = 0;
    this.gateDensities = {
      gate1: 0.2, gate2: 0.4, gate3: 0.8, gate4: 0.3,
      gate5: 0.1, gate6: 0.2, gate7: 0.3, gate8: 0.25,
    };
    this.initializeCrowd(150);
  }

  private tick() {
    this.timeElapsedMs += 1000;
    const seconds = Math.floor(this.timeElapsedMs / 1000);

    this.simulateMatch(seconds);
    this.simulateCrowdMovement();
    this.simulateGateEvents(seconds);
    this.simulateCrowdFlow(seconds);

    this.notify();
  }

  /**
   * Simulate match progression through phases
   */
  private simulateMatch(seconds: number) {
    // 1 real second = ~1 match minute, scaled
    // Pre-match: 0-10s, First half: 10-55s, Half-time: 55-65s, Second half: 65-110s, Full-time: 110+
    if (seconds >= 0 && seconds < 10) {
      this.matchState = {
        ...this.matchState,
        phase: "pre-match",
        minute: Math.floor(seconds / 2),
      };
    } else if (seconds >= 10 && seconds < 55) {
      const matchMinute = Math.min(45, Math.floor((seconds - 10) / 1));
      this.matchState = {
        minute: matchMinute,
        half: 1,
        phase: "first-half",
        homeScore: this.matchState.phase === "pre-match" ? 0 : this.matchState.homeScore,
        awayScore: this.matchState.phase === "pre-match" ? 0 : this.matchState.awayScore,
      };
      // Generate match events
      if (seconds - this.lastMatchEventMinute >= 5 && Math.random() < 0.15) {
        this.lastMatchEventMinute = seconds;
        if (Math.random() < 0.4) {
          // Goal!
          const isHome = Math.random() < 0.5;
          if (isHome) {
            this.matchState.homeScore++;
          } else {
            this.matchState.awayScore++;
          }
          const scorer = isHome ? "HOME" : "AWAY";
          const minute = this.matchState.minute;
          this.log("info", "system", `GOAL! ${scorer} scores! Minute ${minute}`);
        }
      }
    } else if (seconds >= 55 && seconds < 65) {
      this.matchState = {
        ...this.matchState,
        phase: "half-time",
        minute: 45,
      };
      // Half-time crowd movement
      if (seconds === 55) {
        this.log("info", "crowd", "Half-time — increased crowd movement through gates");
        this.spawnGateAlert(
          "gate1",
          `Half-time crowd surge at Gate 1 — moderate movement detected`
        );
      }
    } else if (seconds >= 65 && seconds < 115) {
      const matchMinute = Math.min(90, 45 + Math.floor((seconds - 65) / 1.1));
      this.matchState = {
        minute: matchMinute,
        half: 2,
        phase: "second-half",
        homeScore: this.matchState.homeScore,
        awayScore: this.matchState.awayScore,
      };
      if (seconds - this.lastMatchEventMinute >= 4 && Math.random() < 0.12) {
        this.lastMatchEventMinute = seconds;
        if (Math.random() < 0.3) {
          const isHome = Math.random() < 0.5;
          if (isHome) this.matchState.homeScore++;
          else this.matchState.awayScore++;
          const scorer = isHome ? "HOME" : "AWAY";
          const minute = this.matchState.minute;
          this.log("info", "system", `GOAL! ${scorer} scores! Minute ${minute}`);
        }
      }
    } else {
      this.matchState = {
        ...this.matchState,
        phase: "full-time",
        minute: 90,
      };
      // Full-time crowd surge
      if (seconds === 115) {
        this.log("info", "crowd", "Full-time — heavy crowd exiting through all gates");
        this.spawnGateAlert(
          "gate5",
          "Full-time exit surge at Gate 5 — high egress traffic"
        );
      }
    }

    // Density changes based on match phase
    if (this.matchState.phase === "pre-match") {
      // Gradually increasing density
      for (const gate of Object.keys(this.gateDensities)) {
        this.gateDensities[gate] = Math.min(1, this.gateDensities[gate] + 0.005);
      }
    } else if (this.matchState.phase === "first-half") {
      // Moderate, some gates busier
      this.gateDensities["gate3"] = Math.min(1, 0.7 + Math.sin(seconds * 0.1) * 0.15);
      // Gradually reduce except gate3
      for (const gate of ["gate1", "gate5", "gate6", "gate7", "gate8"]) {
        this.gateDensities[gate] = Math.max(0.1, this.gateDensities[gate] - 0.003);
      }
    } else if (this.matchState.phase === "half-time") {
      // Surge at all gates
      for (const gate of Object.keys(this.gateDensities)) {
        this.gateDensities[gate] = Math.min(1, this.gateDensities[gate] + 0.02);
      }
    } else if (this.matchState.phase === "second-half") {
      // Steady state with some gate variation
      this.gateDensities["gate3"] = Math.min(1, 0.5 + Math.sin(seconds * 0.08) * 0.2);
      this.gateDensities["gate2"] = Math.min(1, 0.4 + Math.sin(seconds * 0.05) * 0.15);
    } else if (this.matchState.phase === "full-time") {
      // Heavy exit flow
      for (const gate of Object.keys(this.gateDensities)) {
        this.gateDensities[gate] = Math.min(1, this.gateDensities[gate] + 0.01);
      }
      this.gateDensities["gate5"] = Math.min(1, 0.85);
      this.gateDensities["gate3"] = Math.min(1, 0.75);
    }
  }

  /**
   * Simulate crowd movement — positions evolve over time
   */
  private simulateCrowdMovement() {
    const newPositions: CrowdPosition[] = [];
    for (const pos of this.crowdPositions) {
      // Random walk
      const dx = (Math.random() - 0.5) * 6;
      const dy = (Math.random() - 0.5) * 6;
      let newX = pos.x + dx;
      let newY = pos.y + dy;

      // Clamp to SVG viewport
      newX = Math.max(10, Math.min(390, newX));
      newY = Math.max(10, Math.min(390, newY));

      // Some crowd members change gate (move toward another)
      const shouldSwitch = Math.random() < 0.02;
      const newGate = shouldSwitch
        ? Object.keys(this.gateCoordinates)[Math.floor(Math.random() * 8)]
        : pos.gate;

      newPositions.push({
        id: pos.id,
        gate: newGate,
        x: newX,
        y: newY,
        timestamp: Date.now(),
        isExiting: this.matchState.phase === "full-time" ? true : pos.isExiting,
      });
    }

    // Remove some and add new (simulating arrival/departure)
    const removalCount = Math.floor(newPositions.length * 0.01);
    newPositions.splice(0, removalCount);

    // Add new crowd members
    const totalCrowd = this.getCrowdCount();
    const additionCount = 50 + Math.floor(totalCrowd * 0.02);
    for (let i = 0; i < additionCount; i++) {
      const gate = Object.keys(this.gateCoordinates)[Math.floor(Math.random() * 8)];
      const coords = this.gateCoordinates[gate];
      newPositions.push({
        id: `crowd-${this.crowdIdCounter++}`,
        gate,
        x: coords.x + (Math.random() - 0.5) * 50,
        y: coords.y + (Math.random() - 0.5) * 50,
        timestamp: Date.now(),
        isExiting: this.matchState.phase === "full-time" || this.matchState.phase === "half-time",
      });
    }

    this.crowdPositions = newPositions;
  }

  /**
   * Generate gate events with alerts based on density thresholds
   */
  private simulateGateEvents(seconds: number) {
    for (const [gate, density] of Object.entries(this.gateDensities)) {
      // Check density changes since last check
      const lastTime = this.lastGateEventGates[gate] || 0;
      const lastDensity = this.gateDensities[gate] || 0;

      if (density >= 0.65 && lastDensity < 0.65) {
        // Threshold crossed: low → high
        this.spawnGateAlert(
          gate,
          `ALERT: Gate ${gate.slice(-1)} at critical density (${Math.round(density * 100)}%) — staff needed immediately`
        );
        this.log("warning", "crowd", `Gate ${gate.slice(-1)} congestion critical — ${Math.round(density * 100)}% capacity`);
      } else if (density >= 0.35 && lastDensity < 0.35) {
        // Threshold crossed: low → medium
        this.spawnGateAlert(
          gate,
          `Warning: Gate ${gate.slice(-1)} density rising (${Math.round(density * 100)}%) — monitor situation`
        );
        this.log("info", "gate", `Gate ${gate.slice(-1)} at ${Math.round(density * 100)}% — monitoring active`);
      } else if (density >= 0.8 && Math.random() < 0.05) {
        // Escalation at critical density
        this.spawnGateAlert(
          gate,
          `ESCALATION: Gate ${gate.slice(-1)} — crowd exceeding safe capacity, deploying additional staff`
        );
        this.log("alert", "crowd", `Crowd escalation at Gate ${gate.slice(-1)} — staff deployment initiated`);
      }

      // Generate periodic entry/exit events based on density
      if (Math.random() < density * 0.03) {
        const type: "entry" | "exit" = Math.random() < 0.6 ? "entry" : "exit";
        const count = Math.round(5 + density * 20);
        this.gateEvents.push({
          timestamp: Date.now(),
          gate,
          type,
          crowdCount: count,
          message: `${count} fans ${type === "entry" ? "entering" : "exiting"} Gate ${gate.slice(-1)}`,
        });
      }

      this.lastGateEventGates[gate] = lastDensity;
    }

    // Trim gate events
    if (this.gateEvents.length > 200) {
      this.gateEvents = this.gateEvents.slice(-100);
    }
  }

  /**
   * Simulate crowd flow — moves crowd between gates and updates counts
   */
  private simulateCrowdFlow(seconds: number) {
    // Keep crowd positions within reasonable count
    const targetCount = 150 + Math.floor(this.timeElapsedMs / 60000) * 30;

    if (this.crowdPositions.length < targetCount) {
      const toAdd = Math.min(10, targetCount - this.crowdPositions.length);
      for (let i = 0; i < toAdd; i++) {
        const gate = Object.keys(this.gateCoordinates)[Math.floor(Math.random() * 8)];
        const coords = this.gateCoordinates[gate];
        this.crowdPositions.push({
          id: `crowd-flow-${this.crowdIdCounter++}`,
          gate,
          x: coords.x + (Math.random() - 0.5) * 40,
          y: coords.y + (Math.random() - 0.5) * 40,
          timestamp: Date.now(),
          isExiting: this.matchState.phase === "full-time",
        });
      }
    }
  }

  private spawnGateAlert(gate: string, message: string) {
    this.gateEvents.push({
      timestamp: Date.now(),
      gate,
      type: "alert",
      message,
    });
  }

  private log(level: "info" | "warning" | "alert", category: "crowd" | "gate" | "system", message: string) {
    const entry: AdminLogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
    };
    this.adminLogs.push(entry);
    // Keep logs trimmed
    if (this.adminLogs.length > 500) {
      this.adminLogs = this.adminLogs.slice(-200);
    }
  }
}

// Singleton engine instance
let engineInstance: LiveDemoEngine | null = null;

export function getLiveDemoEngine(): LiveDemoEngine {
  if (!engineInstance) {
    engineInstance = new LiveDemoEngine();
  }
  return engineInstance;
}

export function resetLiveDemoEngine() {
  engineInstance = null;
}
