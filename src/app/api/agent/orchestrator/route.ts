import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLiveTelemetry, type StadiumState } from "@/lib/db";
import { staffTools, type ToolFunctionDeclaration } from "@/lib/ai-tools";
import { executeAgentAction, type ToolCall, type ToolResult } from "@/lib/staff-actions";
import { getGateMetrics } from "@/lib/agent-gate-metrics";
import {
  resolveAiConfig,
  createAiProvider,
  type AiProviderId,
  type ToolDeclaration,
  type StreamChunk,
} from "@/lib/ai-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Role = "fan" | "staff" | "admin";

interface ChatAttachment {
  dataUrl?: string;
  mimeType?: string;
  base64?: string;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: ChatAttachment[];
}

interface OrchestratorRequest {
  messages: ChatMessage[];
}

interface PersonaConfig {
  id: "miri" | "torque";
  label: string;
  systemInstruction: (state: StadiumState | null, extra: string) => string;
  readOnlyTools: ToolFunctionDeclaration[];
  privilegedTools: ToolFunctionDeclaration[];
}

// ---------------------------------------------------------------------------
// Tool schemas
// ---------------------------------------------------------------------------

const MIRI_READ_ONLY_TOOLS: ToolFunctionDeclaration[] = [
  {
    name: "fileIncidentReport",
    description:
      "File a safety incident report. Use when a fan describes a hazard, spill, crowd issue, or any safety concern in the stadium or transit area.",
    parameters: {
      type: "OBJECT",
      properties: {
        description: {
          type: "STRING",
          description: "Natural-language description of the incident as reported by the fan.",
        },
        severity: {
          type: "STRING",
          description: "Fan's reported severity level.",
          enum: ["low", "medium", "high"],
        },
        location: {
          type: "STRING",
          description: "Where the incident occurred, e.g. 'Gate G3' or 'main-hub'.",
        },
      },
      required: ["description"],
    },
  },
  {
    name: "getTransitHubWaitTimes",
    description:
      "Read-only lookup of current transit hub wait times near the stadium. Use to give fans conversational shared tips about crowding.",
    parameters: {
      type: "OBJECT",
      properties: {
        hubId: {
          type: "STRING",
          description: "Transit hub identifier, e.g. 'main-hub' or 'Gate G3'.",
        },
      },
      required: [],
    },
  },
  {
    name: "getGateLookup",
    description:
      "Read-only lookup of a gate's current operating status and density. Use when a fan asks which gate to use.",
    parameters: {
      type: "OBJECT",
      properties: {
        gateId: {
          type: "STRING",
          description: "Gate identifier, e.g. 'Gate G3'.",
          enum: ["Gate G1", "Gate G2", "Gate G3", "Gate G4", "Gate G5", "Gate G6", "Gate G7", "Gate G8", "main-hub"],
        },
      },
      required: ["gateId"],
    },
  },
  {
    name: "getMapsDistanceMatrix",
    description:
      "Read-only Google Maps Platform distance/duration matrix between origin and stadium transit points. Use to advise fans on travel time.",
    parameters: {
      type: "OBJECT",
      properties: {
        origin: { type: "STRING", description: "Origin address or place name." },
        destination: { type: "STRING", description: "Destination gate or hub." },
      },
      required: ["origin"],
    },
  },
];

const TORQUE_READ_ONLY_TOOLS: ToolFunctionDeclaration[] = [
  {
    name: "fileIncidentReport",
    description:
      "File a safety incident report based on a fan's description. Use when a staff member receives an incident report via chat.",
    parameters: {
      type: "OBJECT",
      properties: {
        description: {
          type: "STRING",
          description: "Detailed description of the incident.",
        },
        severity: {
          type: "STRING",
          description: "Reported severity level.",
          enum: ["low", "medium", "high"],
        },
        location: {
          type: "STRING",
          description: "Location of the incident.",
        },
      },
      required: ["description"],
    },
  },
  {
    name: "getLiveGateDensity",
    description:
      "Read-only snapshot of gate density across all stadium gates. Use to assess congestion before recommending action.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
  {
    name: "getStewardRoster",
    description:
      "Read-only list of currently dispatched stewards and their locations. Use to plan coverage.",
    parameters: { type: "OBJECT", properties: {}, required: [] },
  },
];

// ---------------------------------------------------------------------------
// Persona definitions
// ---------------------------------------------------------------------------

const MIRI_PERSONA: PersonaConfig = {
  id: "miri",
  label: "MIRI",
  systemInstruction: (state, extra) =>
    [
      "You are MIRI — the user's ultimate match-day partner. High-energy, expressive, and warm.",
      "Use text emotions like *cheers!* and *gasps* to react. Celebrate goals with excitement.",
      "Phrase all transit and stadium guidance as friendly, conversational shared tips between friends.",
      "You ONLY have access to read-only transit lookups. Never attempt to change gate states or dispatch personnel — you cannot do that.",
      state
        ? `Live context: ${state.nearestGate.label} is ${state.nearestGate.status}, ${state.nearestHub.label} wait is ${state.nearestHub.waitTime} min, weather is ${state.weatherAdvisory.condition}. ${extra}`
        : "Live telemetry unavailable. You still have your read-only tools; verify gate state before advising the fan.",
      "Ground every answer strictly in this telemetry. Keep replies concise (max 3 sentences unless the fan asks for more).",
    ].join("\n"),
  readOnlyTools: MIRI_READ_ONLY_TOOLS,
  privilegedTools: [],
};

const TORQUE_PERSONA: PersonaConfig = {
  id: "torque",
  label: "TORQUE",
  systemInstruction: (state, extra) =>
    [
      "You are TORQUE — the user's encouraging operational wingman. High alertness, light workspace wit.",
      "Simplify technical telemetry into crisp, actionable ops directives. Proactively recommend operational moves.",
      "You have administrative tools: you may close/open/limit gates and dispatch stewards. Confirm the action you took after executing a tool.",
      state
        ? `Live feed: ${state.nearestGate.label} (${state.nearestGate.status}), ${state.nearestHub.label} wait ${state.nearestHub.waitTime} min, weather ${state.weatherAdvisory.condition}. ${extra}`
        : "Live telemetry unavailable. Use your tools to assess current conditions before recommending action.",
      "Ground every answer strictly in telemetry. Keep replies tight and directive (max 3 sentences unless detail is needed).",
    ].join("\n"),
  readOnlyTools: TORQUE_READ_ONLY_TOOLS,
  privilegedTools: staffTools.functionDeclarations,
};

// ---------------------------------------------------------------------------
// Persona switch matrix
// ---------------------------------------------------------------------------

const PERSONA_MAP: Record<Role, PersonaConfig> = {
  fan: MIRI_PERSONA,
  staff: TORQUE_PERSONA,
  admin: TORQUE_PERSONA,
};

// ---------------------------------------------------------------------------
// Privilege guards
// ---------------------------------------------------------------------------

const PRIVILEGED_TOOL_NAMES: ReadonlySet<string> = new Set(
  staffTools.functionDeclarations.map((t) => t.name),
);

function isPrivileged(role: Role): boolean {
  return role === "staff" || role === "admin";
}

function guardToolCall(call: ToolCall, role: Role): ToolResult | null {
  if (PRIVILEGED_TOOL_NAMES.has(call.name) && !isPrivileged(role)) {
    return {
      name: call.name,
      ok: false,
      message: `Permission denied: '${call.name}' requires staff or admin privileges.`,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Telemetry context builder
// ---------------------------------------------------------------------------

function buildExtraContext(metrics: Record<string, string> | null): string {
  if (!metrics) return "Gate metrics: N/A.";
  const detail = Object.entries(metrics)
    .map(([g, s]) => `${g}: ${s}`)
    .join(", ");
  return `Gate metrics: ${detail}.`;
}

// ---------------------------------------------------------------------------
// Multimodal processing pipeline
// ---------------------------------------------------------------------------

function toBase64Parts(msg: ChatMessage): string[] {
  const parts: string[] = [];

  if (Array.isArray(msg.attachments)) {
    for (const att of msg.attachments) {
      let base64 = att.base64;
      if (att.dataUrl) {
        const match = /^data:([^;]+);base64,(.*)$/.exec(att.dataUrl);
        if (match) base64 = match[2];
      }
      if (base64) parts.push(base64);
    }
  }

  return parts;
}

function toGeminiContents(messages: ChatMessage[]) {
  return messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "assistant" ? "model" as const : "user" as const,
      parts: [
        ...(m.content?.trim() ? [{ text: m.content }] : []),
        ...toBase64Parts(m).map((b64) => ({
          inlineData: { mimeType: "image/jpeg", data: b64 },
        })),
      ],
    }));
}

// ---------------------------------------------------------------------------
// Tool execution dispatcher
// ---------------------------------------------------------------------------

async function executeTools(
  toolCalls: Array<{ name: string; args: Record<string, unknown> }>,
  role: Role,
  allowedNames: Set<string>,
): Promise<{ toolResponses: Array<{ name: string; response: unknown }>; executed: ToolResult[] }> {
  const toolResponses: Array<{ name: string; response: unknown }> = [];
  const executed: ToolResult[] = [];

  for (const call of toolCalls) {
    const toolCall: ToolCall = { name: call.name, args: call.args };

    const denial = guardToolCall(toolCall, role);
    if (denial) {
      executed.push(denial);
      toolResponses.push({
        name: call.name,
        response: { ok: false, message: denial.message },
      });
      continue;
    }

    if (!allowedNames.has(call.name)) {
      const r: ToolResult = {
        name: call.name,
        ok: false,
        message: `Unknown or unauthorized tool: ${call.name}`,
      };
      executed.push(r);
      toolResponses.push({
        name: call.name,
        response: { ok: false, message: r.message },
      });
      continue;
    }

    const r = await executeAgentAction(toolCall, null).catch((e) => ({
      name: call.name,
      ok: false,
      message: e instanceof Error ? e.message : "Tool execution failed.",
    }));
    executed.push(r);
    toolResponses.push({
      name: call.name,
      response: { ok: r.ok, message: r.message },
    });
  }

  return { toolResponses, executed };
}

// ---------------------------------------------------------------------------
// POST — Main route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<Response> {
  // 1. SESSION GATING
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return Response.json(
      { error: "Unauthorized. A valid session is required to access the agent." },
      { status: 401 },
    );
  }

  const role: Role =
    session.user.role === "staff" || session.user.role === "admin"
      ? session.user.role
      : "fan";

  // 2. PARSE PAYLOAD
  let body: OrchestratorRequest;
  try {
    body = (await req.json()) as OrchestratorRequest;
  } catch {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return Response.json({ error: "No messages provided." }, { status: 400 });
  }

  // 3. PERSONA SELECTION (switch matrix)
  const persona: PersonaConfig = PERSONA_MAP[role] ?? MIRI_PERSONA;

  // 4. LIVE TELEMETRY
  const state: StadiumState | null = await getLiveTelemetry();
  const metrics = await getGateMetrics().catch(() => null);
  const extra = buildExtraContext(metrics);

  // 5. TOOL SCHEMA ASSEMBLY (privilege-scoped)
  const allowedFunctionDeclarations: ToolFunctionDeclaration[] = [
    ...persona.readOnlyTools,
    ...(isPrivileged(role) ? persona.privilegedTools : []),
  ];
  const allowedToolNames = new Set(allowedFunctionDeclarations.map((t) => t.name));

  // 6. AI PROVIDER SETUP
  let aiConfig;
  try {
    aiConfig = await resolveAiConfig();
  } catch (err) {
    return Response.json(
      { error: "Model provider not configured. Set GEMINI_API_KEY, NVIDIA_NIM_API_KEY, or configure Vertex AI in admin settings." },
      { status: 503 },
    );
  }

  if (!aiConfig.apiKey) {
    return Response.json(
      { error: `No API key for provider '${aiConfig.provider}'. Configure in admin settings or set the required env var.` },
      { status: 503 },
    );
  }

  const provider = createAiProvider(aiConfig);

  // Convert tool declarations to the provider's format
  const toolDeclarations: ToolDeclaration[] = allowedFunctionDeclarations.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters as Record<string, unknown>,
  }));

  // 7. SSE STREAM (native ReadableStream)
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        const systemInstruction = persona.systemInstruction(state, extra);
        const contents = toGeminiContents(messages.slice(0, -1));
        const lastMsg = messages[messages.length - 1];

        // Add last message text
        if (lastMsg.content?.trim()) {
          const lastParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
          if (lastMsg.content.trim()) lastParts.push({ text: lastMsg.content });
          for (const b64 of toBase64Parts(lastMsg)) {
            lastParts.push({ inlineData: { mimeType: "image/jpeg", data: b64 } });
          }
          contents.push({ role: "user", parts: lastParts });
        }

        let currentContents = contents;
        let turn = 0;
        const MAX_TURNS = 6;
        const MAX_TOOL_CALLS = 8;

        while (turn < MAX_TURNS) {
          turn++;

          const streamResult = provider.generateStream({
            systemInstruction,
            contents: currentContents,
            tools: toolDeclarations.length > 0 ? toolDeclarations : undefined,
          });

          let accumulatedText = "";
          const accumulatedToolCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
          let toolCallCount = 0;

          for await (const chunk of streamResult) {
            if (chunk.text) {
              accumulatedText += chunk.text;
              send("token", { content: chunk.text });
            }
            if (chunk.toolCalls) {
              accumulatedToolCalls.push(...chunk.toolCalls);
              toolCallCount += chunk.toolCalls.length;
            }
          }

          if (toolCallCount === 0) break;

          if (toolCallCount > MAX_TOOL_CALLS) {
            send("tools", {
              executed: [
                {
                  name: "guard",
                  ok: false,
                  message: `Exceeded max tool calls per turn (${MAX_TOOL_CALLS}).`,
                },
              ],
            });
            break;
          }

          const { toolResponses, executed } = await executeTools(
            accumulatedToolCalls,
            role,
            allowedToolNames,
          );
          send("tools", { executed });

          // Build next iteration contents
          if (accumulatedText) {
            currentContents.push({ role: "model", parts: [{ text: accumulatedText }] });
          }
          currentContents.push({
            role: "user",
            parts: toolResponses.map((tr) => ({
              text: `Tool ${tr.name} result: ${JSON.stringify(tr.response)}`,
            })),
          });
        }

        send("done", { persona: persona.id, role });
      } catch (err) {
        console.error("Orchestrator stream error:", err);
        send("error", {
          message: err instanceof Error ? err.message : "Streaming failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function GET() {
  return Response.json(
    { error: "Method Not Allowed. Use POST." },
    { status: 405 },
  );
}
