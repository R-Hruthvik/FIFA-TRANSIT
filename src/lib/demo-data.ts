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
    "Security is active at all gates. Gate G3 is experiencing heavy congestion — additional staff have been deployed. All other gates are operating normally.",
  "gate capacity":
    "Gate G1: Normal (20%). Gate G2: Warning (55%). Gate G3: Critical (90%) — avoid this entry point. Gate G4: Normal (25%). Gate G5: Normal (20%). Gate G6: Normal (15%). Gate G7: Normal (20%). Gate G8: Normal (15%).",
  "transit alerts":
    "Main Hub shuttle wait time is 12 minutes due to increased foot traffic. Express shuttle rerouted to Gate G4. Next shuttle in 3 minutes.",
  default:
    "I'm monitoring all stadium systems. Gate G3 is under heavy load — I recommend using Gate G1 or G5 for faster entry. Transit shuttles are running on schedule.",
};

export const DEMO_TIMELINE: DemoSnapshot[] = [
  // 0-10s: All calm
  {
    timestamp: 0,
    metrics: { 
      gate1: "low", gate2: "low", gate3: "low", gate4: "low",
      gate5: "low", gate6: "low", gate7: "low", gate8: "low"
    },
    telemetry: {
      nearestGate: { label: "Gate G1", status: "open" },
      nearestHub: { label: "Main Hub", waitTime: 5 },
      weatherAdvisory: { label: "Clear", condition: "clear" },
    },
    queries: [
      "What time does the match start?",
      "Where is Gate G2?",
      "Is the metro running?",
    ],
    aiResponses: {},
  },
  // 10-20s: Gate G3 rising
  {
    timestamp: 10_000,
    metrics: { 
      gate1: "low", gate2: "low", gate3: "medium", gate4: "low",
      gate5: "low", gate6: "low", gate7: "low", gate8: "low"
    },
    telemetry: {
      nearestGate: { label: "Gate G1", status: "open" },
      nearestHub: { label: "Main Hub", waitTime: 7 },
      weatherAdvisory: { label: "Clear", condition: "clear" },
    },
    queries: [
      "Crowd building at Gate G3",
      "Gate G3 is getting busy",
      "Should I use a different gate?",
    ],
    aiResponses: {},
  },
  // 20-30s: Gate G3 critical, Gate G2 rising
  {
    timestamp: 20_000,
    metrics: { 
      gate1: "low", gate2: "medium", gate3: "high", gate4: "low",
      gate5: "low", gate6: "low", gate7: "low", gate8: "low"
    },
    telemetry: {
      nearestGate: { label: "Gate G2", status: "congested" },
      nearestHub: { label: "Main Hub", waitTime: 10 },
      weatherAdvisory: { label: "Overcast", condition: "clear" },
    },
    queries: [
      "Gate G3 is completely packed!",
      "What's happening at Gate G3?",
      "Need alternative route to seats",
    ],
    aiResponses: {
      "what's happening at gate g3":
        "Gate G3 is experiencing critical congestion. Estimated 4,000 fans queuing. Staff have been redeployed from Gate G5. I recommend Gate G1 or Gate G2 for entry — wait times are significantly lower.",
    },
  },
  // 30-40s: Peak crisis
  {
    timestamp: 30_000,
    metrics: { 
      gate1: "low", gate2: "medium", gate3: "high", gate4: "low",
      gate5: "low", gate6: "low", gate7: "low", gate8: "low"
    },
    telemetry: {
      nearestGate: { label: "Gate G3", status: "congested" },
      nearestHub: { label: "Express Shuttle", waitTime: 12 },
      weatherAdvisory: { label: "Overcast", condition: "clear" },
    },
    queries: [
      "Can someone help at Gate G3?",
      "Security called to Gate G3",
      "Fans frustrated at Gate G3 entrance",
    ],
    aiResponses: {
      gate: AI_RESPONSES["gate capacity"],
    },
  },
  // 40-50s: Response underway
  {
    timestamp: 40_000,
    metrics: { 
      gate1: "low", gate2: "medium", gate3: "high", gate4: "low",
      gate5: "low", gate6: "low", gate7: "low", gate8: "low"
    },
    telemetry: {
      nearestGate: { label: "Gate G3", status: "congested" },
      nearestHub: { label: "Express Shuttle", waitTime: 11 },
      weatherAdvisory: { label: "Overcast", condition: "clear" },
    },
    queries: [
      "Staff responding to Gate G3",
      "Additional turnstiles opened",
      "Gate G3 crowd slowly moving",
    ],
    aiResponses: AI_RESPONSES,
  },
  // 50-60s: Recovery
  {
    timestamp: 50_000,
    metrics: { 
      gate1: "low", gate2: "low", gate3: "medium", gate4: "low",
      gate5: "low", gate6: "low", gate7: "low", gate8: "low"
    },
    telemetry: {
      nearestGate: { label: "Gate G1", status: "open" },
      nearestHub: { label: "Main Hub", waitTime: 8 },
      weatherAdvisory: { label: "Clear", condition: "clear" },
    },
    queries: [
      "Gate G3 situation improving",
      "Thank you staff for the help",
      "All gates operating again",
    ],
    aiResponses: {
      default:
        "Crisis resolved. Gate G3 congestion has dropped to medium. Staff are standing down. All gates are now operational. Thank you for your patience during the incident.",
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
