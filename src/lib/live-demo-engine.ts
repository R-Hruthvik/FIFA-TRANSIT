"use client";

import { GateMetrics, StadiumTelemetry } from "@/types/telemetry";

export interface CrowdPosition {
  id: string;
  gate: string;
  x: number;
  y: number;
  timestamp: number;
  isExiting: boolean;
}

export interface GateEvent {
  timestamp: number;
  gate: string;
  type: "entry" | "exit" | "alert";
  crowdCount?: number;
  message: string;
}

export interface AdminLogEntry {
  timestamp: number;
  level: "info" | "warning" | "alert";
  category: "crowd" | "gate" | "system";
  message: string;
  data?: Record<string, unknown>;
}

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
  private timeoutId: NodeJS.Timeout | null = null;
  private lastTickTime: number | null = null;
  private listeners: Array<() => void> = [];
  private crowdIdCounter = 0;

  private gateDensities: Record<string, number> = {
    gate1: 0.2, gate2: 0.4, gate3: 0.8, gate4: 0.3,
    gate5: 0.1, gate6: 0.2, gate7: 0.3, gate8: 0.25,
  };

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

  private matchState: MatchSimulationState = {
    minute: 0,
    half: 1,
    homeScore: 0,
    awayScore: 0,
    phase: "pre-match",
  };

  private lastMatchEventMinute = 0;
  private hasMatchStarted = false;

  private lastGateEventGates: Record<string, number> = {};

  private realUserCount = 0;

  constructor() {
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
    return this.crowdPositions;
  }

  getCrowdCount(): number {
    return this.crowdPositions.length + this.realUserCount;
  }

  getGateEvents(): GateEvent[] {
    return this.gateEvents.slice(-50);
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
        label: `Gate ${highestGate.slice(-1).toUpperCase()}`,        status: highestStatus === "high" ? "congested" : highestStatus === "medium" ? "busy" : "open",
      },
      nearestHub: {
        label: "Main Hub",
        waitTime: Math.min(15, Math.round(5 + total * 0.02)),
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
    this.lastTickTime = Date.now();
    this.scheduleNextTick();
    this.log("info", "system", "Demo simulation started — all systems operational");
    this.log("info", "crowd", "Initial crowd detected — monitoring all gates");
  }

  stop() {
    this.isRunning = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.log("info", "system", "Demo simulation stopped");
    this.notify();
  }

  private scheduleNextTick() {
    if (!this.isRunning) return;

    const baseInterval = Math.floor(Math.random() * 400) + 850; // 850–1250 ms
    this.timeoutId = setTimeout(() => {
      this.tick();
      this.scheduleNextTick();
    }, baseInterval);
  }

  private tick(tickDelta?: number) {
    const delta = tickDelta ?? 1000;
    this.timeElapsedMs += delta;
    const seconds = Math.floor(this.timeElapsedMs / 1000);

    this.simulateMatch(seconds);
    this.simulateCrowdMovement();
    this.simulateGateEvents(seconds);
    this.simulateCrowdFlow(seconds);

    this.notify();
  }

  private simulateMatch(seconds: number) {
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
      const minEventInterval = Math.random() < 0.3 ? 3 : (Math.random() < 0.6 ? 4 : 5);
      if (seconds - this.lastMatchEventMinute >= minEventInterval && Math.random() < 0.15) {
        this.lastMatchEventMinute = seconds;
        if (Math.random() < (0.4 + Math.random() * 0.2)) {
          const isHome = Math.random() < 0.5;
          if (isHome) this.matchState.homeScore++;
          else this.matchState.awayScore++;
          const scorer = isHome ? "HOME" : "AWAY";
          const minute = this.matchState.minute;
          this.log("info", "system", `GOAL! ${scorer} scores! Minute ${minute}`);
        }
      }
    } else if (seconds >= 55 && seconds < 65) {
      const halfTimeEnd = 55 + Math.floor(Math.random() * 5);
      if (seconds < halfTimeEnd) {
        this.matchState = {
          ...this.matchState,
          phase: "half-time",
          minute: 45,
        };
        if (seconds === 55) {
          this.log("info", "crowd", "Half-time — increased crowd movement through gates");
          this.spawnGateAlert(
            "gate1",
            `Half-time crowd surge at Gate 1 — moderate movement detected`
          );
        }
      } else {
        const elapsedSecondsInSecondHalf = seconds - halfTimeEnd;
        if (Math.random() < 0.03) {
          this.matchState = {
            ...this.matchState,
            phase: "second-half",
          };
        } else {
          const matchMinute = Math.min(90, 45 + Math.floor(elapsedSecondsInSecondHalf / 1.1));
          this.matchState = {
            minute: matchMinute,
            half: 2,
            phase: "second-half",
            homeScore: this.matchState.homeScore,
            awayScore: this.matchState.awayScore,
          };
          const minEventInterval = 4 + Math.floor(Math.random() * 3);
          if (elapsedSecondsInSecondHalf - this.lastMatchEventMinute >= minEventInterval && Math.random() < (0.12 + Math.random() * 0.08)) {
            this.lastMatchEventMinute = elapsedSecondsInSecondHalf;
            if (Math.random() < (0.3 + Math.random() * 0.2)) {
              const isHome = Math.random() < 0.5;
              if (isHome) this.matchState.homeScore++;
              else this.matchState.awayScore++;
              const scorer = isHome ? "HOME" : "AWAY";
              const minute = this.matchState.minute;
              this.log("info", "system", `GOAL! ${scorer} scores! Minute ${minute}`);
            }
          }
        }
      }
    } else if (seconds >= 65 && seconds < 115) {
      const fullTimeStart = 65 + Math.floor(Math.random() * 20) + 45;
      if (seconds < fullTimeStart) {
        const elapsedSecondsInSecondHalf = seconds - 65;
        const matchMinute = Math.min(90, 45 + Math.floor(elapsedSecondsInSecondHalf / 1.1));
        this.matchState = {
          minute: matchMinute,
          half: 2,
          phase: "second-half",
          homeScore: this.matchState.homeScore,
          awayScore: this.matchState.awayScore,
        };
        const weightedRandom = Math.random() * (0.5 + (matchMinute / 90)) + 0.07;
        const minEventInterval = Math.max(3, 8 - Math.floor(matchMinute / 20));
        if (elapsedSecondsInSecondHalf - this.lastMatchEventMinute >= minEventInterval && Math.random() < weightedRandom) {
          this.lastMatchEventMinute = elapsedSecondsInSecondHalf;
          if (Math.random() < (0.25 + Math.random() * 0.25)) {
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
        if (seconds === fullTimeStart) {
          this.log("info", "crowd", "Full-time — heavy crowd exiting through all gates");
          this.spawnGateAlert(
            "gate5",
            "Full-time exit surge at Gate 5 — high egress traffic"
          );
        }
      }
    } else {
      this.matchState = {
        ...this.matchState,
        phase: "full-time",
        minute: 90,
      };
    }

    if (this.matchState.phase === "pre-match") {
      for (const gate of Object.keys(this.gateDensities)) {
        this.gateDensities[gate] = Math.min(1, this.gateDensities[gate] + 0.005);
      }
    } else if (this.matchState.phase === "first-half") {
      this.gateDensities["gate3"] = Math.min(1, 0.7 + Math.sin(seconds * 0.1) * 0.15);
      for (const gate of ["gate1", "gate5", "gate6", "gate7", "gate8"]) {
        this.gateDensities[gate] = Math.max(0.1, this.gateDensities[gate] - 0.003);
      }
    } else if (this.matchState.phase === "half-time") {
      for (const gate of Object.keys(this.gateDensities)) {
        this.gateDensities[gate] = Math.min(1, this.gateDensities[gate] + 0.02);
      }
    } else if (this.matchState.phase === "second-half") {
      this.gateDensities["gate3"] = Math.min(1, 0.5 + Math.sin(seconds * 0.08) * 0.2);
      this.gateDensities["gate2"] = Math.min(1, 0.4 + Math.sin(seconds * 0.05) * 0.15);
    } else if (this.matchState.phase === "full-time") {
      for (const gate of Object.keys(this.gateDensities)) {
        this.gateDensities[gate] = Math.min(1, this.gateDensities[gate] + 0.01);
      }
      this.gateDensities["gate5"] = Math.min(1, 0.85);
      this.gateDensities["gate3"] = Math.min(1, 0.75);
    }
  }

  private simulateCrowdMovement() {
    const newPositions: CrowdPosition[] = [];
    for (const pos of this.crowdPositions) {
      const dx = (Math.random() - 0.5) * 6;
      const dy = (Math.random() - 0.5) * 6;
      let newX = pos.x + dx;
      let newY = pos.y + dy;
      newX = Math.max(10, Math.min(390, newX));
      newY = Math.max(10, Math.min(390, newY));
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
    const removalCount = Math.floor(newPositions.length * 0.01);
    newPositions.splice(0, removalCount);
    const totalCrowd = this.getCrowdCount();
    const currentLen = newPositions.length;
    const maxCrowd = 500;
    const additionCount = currentLen >= maxCrowd ? 0 : Math.min(50 + Math.floor(totalCrowd * 0.02), maxCrowd - currentLen);
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

  private spawnGateAlert(gate: string, message: string) {
    this.gateEvents.push({
      timestamp: Date.now(),
      gate,
      type: "alert",
      message,
    });
    this.log("alert", "crowd", message);
  }

  private spawnEvent(gate: string, type: "entry" | "exit", message: string) {
    const count = Math.round(5 + this.gateDensities[gate] * 20);
    this.gateEvents.push({
      timestamp: Date.now(),
      gate,
      type,
      crowdCount: count,
      message,
    });
  }

  private simulateGateEvents(_seconds: number) {
    for (const [gate, density] of Object.entries(this.gateDensities)) {
      const _lastTime = this.lastGateEventGates[gate] || 0;
      const lastDensity = this.gateDensities[gate] || 0;

      if (density >= 0.65 && lastDensity < 0.65) {
        this.spawnGateAlert(
          gate,
          `ALERT: Gate ${gate.slice(-1)} at critical density (${Math.round(density * 100)}%) — staff needed immediately`
        );
        this.log("warning", "crowd", `Gate ${gate.slice(-1)} congestion critical — ${Math.round(density * 100)}% capacity`);
      } else if (density >= 0.35 && lastDensity < 0.35) {
        this.spawnGateAlert(
          gate,
          `Warning: Gate ${gate.slice(-1)} density rising (${Math.round(density * 100)}%) — monitor situation`
        );
        this.log("info", "gate", `Gate ${gate.slice(-1)} at ${Math.round(density * 100)}% — monitoring active`);
      } else if (density >= 0.8 && Math.random() < 0.05) {
        this.spawnGateAlert(
          gate,
          `ESCALATION: Gate ${gate.slice(-1)} — crowd exceeding safe capacity, deploying additional staff`
        );
        this.log("alert", "crowd", `Crowd escalation at Gate ${gate.slice(-1)} — staff deployment initiated`);
      }

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
    }
  }

  private simulateCrowdFlow(_seconds: number) {
    // Placeholder for any additional crowd flow logic
  }

  applyGateOverride(_gate: string, _status: "OPEN" | "CLOSED" | "LIMITED"): void {}
  applyStewardDispatch(_location: string, _count: number): void {}
  applyIncidentReport(_description: string, _severity: string, _location: string): void {}
  loadScenario(_scenario: {
    title?: string;
    snapshots: Array<{
      t: number;
      gateDensities: Record<string, number>;
      alerts?: string[];
      fanQueries?: string[];
      thermal?: { hotspotGate: string; intensity: number };
    }>;
    broadcastMessage?: string;
  }): void {}

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

  log(level: "info" | "warning" | "alert", category: "crowd" | "gate" | "system", message: string, data?: Record<string, unknown>) {
    this.adminLogs.push({
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
    });
  }
}
