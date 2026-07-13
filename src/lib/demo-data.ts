import { GateMetrics, StadiumTelemetry } from "@/types/telemetry";

export interface DemoSnapshot {
  timestamp: number; // ms into demo
  metrics: GateMetrics;
  telemetry: StadiumTelemetry;
  queries: string[];
  aiResponses: Record<string, string>;
}

const AI_RESPONSES: Record<string, string> = {
  "security status":
    "Security is active at all gates. Gate C is experiencing heavy congestion — additional staff have been deployed. All other gates are operating normally.",
  "gate capacity":
    "Gate A: Normal (20%). Gate B: Warning (55%). Gate C: Critical (90%) — avoid this entry point. Gate D: Normal (20%).",
  "transit alerts":
    "Main Hub shuttle wait time is 12 minutes due to increased foot traffic. Express shuttle rerouted to Gate D. Next shuttle in 3 minutes.",
  default:
    "I'm monitoring all stadium systems. Gate C is under heavy load — I recommend using Gate A or D for faster entry. Transit shuttles are running on schedule.",
};

export const DEMO_TIMELINE: DemoSnapshot[] = [
  // 0-10s: All calm
  {
    timestamp: 0,
    metrics: { gateA: "low", gateB: "low", gateC: "low", gateD: "low" },
    telemetry: {
      nearestGate: { label: "Gate A", status: "open" },
      nearestHub: { label: "Main Hub", waitTime: 5 },
      weatherAdvisory: { label: "Clear", condition: "clear" },
    },
    queries: [
      "What time does the match start?",
      "Where is Gate B?",
      "Is the metro running?",
    ],
    aiResponses: {},
  },
  // 10-20s: Gate C rising
  {
    timestamp: 10_000,
    metrics: { gateA: "low", gateB: "low", gateC: "medium", gateD: "low" },
    telemetry: {
      nearestGate: { label: "Gate A", status: "open" },
      nearestHub: { label: "Main Hub", waitTime: 7 },
      weatherAdvisory: { label: "Clear", condition: "clear" },
    },
    queries: [
      "Crowd building at Gate C",
      "Gate C is getting busy",
      "Should I use a different gate?",
    ],
    aiResponses: {},
  },
  // 20-30s: Gate C critical, Gate B rising
  {
    timestamp: 20_000,
    metrics: { gateA: "low", gateB: "medium", gateC: "high", gateD: "low" },
    telemetry: {
      nearestGate: { label: "Gate B", status: "congested" },
      nearestHub: { label: "Main Hub", waitTime: 10 },
      weatherAdvisory: { label: "Overcast", condition: "clear" },
    },
    queries: [
      "Gate C is completely packed!",
      "What's happening at Gate C?",
      "Need alternative route to seats",
    ],
    aiResponses: {
      "what's happening at gate c":
        "Gate C is experiencing critical congestion. Estimated 4,000 fans queuing. Staff have been redeployed from Gate D. I recommend Gate A or Gate B for entry — wait times are significantly lower.",
    },
  },
  // 30-40s: Peak crisis
  {
    timestamp: 30_000,
    metrics: { gateA: "low", gateB: "medium", gateC: "high", gateD: "low" },
    telemetry: {
      nearestGate: { label: "Gate C", status: "congested" },
      nearestHub: { label: "Express Shuttle", waitTime: 12 },
      weatherAdvisory: { label: "Overcast", condition: "clear" },
    },
    queries: [
      "Can someone help at Gate C?",
      "Security called to Gate C",
      "Fans frustrated at Gate C entrance",
    ],
    aiResponses: {
      gate: AI_RESPONSES["gate capacity"],
    },
  },
  // 40-50s: Response underway
  {
    timestamp: 40_000,
    metrics: { gateA: "low", gateB: "medium", gateC: "high", gateD: "low" },
    telemetry: {
      nearestGate: { label: "Gate C", status: "congested" },
      nearestHub: { label: "Express Shuttle", waitTime: 11 },
      weatherAdvisory: { label: "Overcast", condition: "clear" },
    },
    queries: [
      "Staff responding to Gate C",
      "Additional turnstiles opened",
      "Gate C crowd slowly moving",
    ],
    aiResponses: AI_RESPONSES,
  },
  // 50-60s: Recovery
  {
    timestamp: 50_000,
    metrics: { gateA: "low", gateB: "low", gateC: "medium", gateD: "low" },
    telemetry: {
      nearestGate: { label: "Gate A", status: "open" },
      nearestHub: { label: "Main Hub", waitTime: 8 },
      weatherAdvisory: { label: "Clear", condition: "clear" },
    },
    queries: [
      "Gate C situation improving",
      "Thank you staff for the help",
      "All gates operating again",
    ],
    aiResponses: {
      default:
        "Crisis resolved. Gate C congestion has dropped to medium. Staff are standing down. All gates are now operational. Thank you for your patience during the incident.",
    },
  },
];

export function getDemoSnapshot(elapsedMs: number): DemoSnapshot {
  // Find the most recent snapshot at or before elapsedMs
  let snapshot = DEMO_TIMELINE[0];
  for (const s of DEMO_TIMELINE) {
    if (elapsedMs >= s.timestamp) {
      snapshot = s;
    } else {
      break;
    }
  }
  return snapshot;
}

export function getDemoAiResponse(input: string, snapshot: DemoSnapshot): string {
  const lower = input.toLowerCase();
  // Check specific responses first
  for (const [key, response] of Object.entries(snapshot.aiResponses)) {
    if (lower.includes(key)) return response;
  }
  return snapshot.aiResponses["default"] || AI_RESPONSES["default"];
}

export const DEMO_DURATION_MS = 60_000;
