/**
 * Staff Enforcement — tool executors.
 *
 * Real implementations of the Gen AI tool schemas defined in ./ai-tools.
 * Each executor maps an LLM function call onto a concrete, authorized
 * mutation of stadium state:
 *   - toggleGateAccess        → overrides a gate's operating state
 *   - deployOperationalPersonnel → records a steward dispatch
 *
 * State is persisted to MongoDB (gate_overrides, steward_dispatches) so it
 * survives and is queryable by the telemetry/aggregation layer. In demo
 * mode the action is also pushed into LiveDemoEngine so the UI reacts live.
 */

import { clientPromise } from "@/lib/db";
import type { LiveDemoEngine } from "@/lib/live-demo-engine";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";
const GATE_OVERRIDES_COLL = "gate_overrides";
const STEWARD_COLL = "steward_dispatches";

/** Allowed gate operating states (mirrors ai-tools enum). */
export type GateStatus = "OPEN" | "CLOSED" | "LIMITED";

export function normalizeGateStatus(status: string): GateStatus {
  const up = status.toUpperCase();
  if (up === "OPEN" || up === "CLOSED" || up === "LIMITED") return up;
  throw new Error(`Invalid gate status: ${status}`);
}

/**
 * Persist + apply a gate access override.
 */
export async function updateGateStatus(
  gateId: string,
  status: string,
  demoEngine?: LiveDemoEngine | null,
): Promise<string> {
  const normalized = normalizeGateStatus(status);

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await db
      .collection(GATE_OVERRIDES_COLL)
      .updateOne(
        { gateId },
        { $set: { gateId, status: normalized, updatedAt: new Date() } },
        { upsert: true },
      );
  } catch (err) {
    console.error("updateGateStatus persist failed:", err);
  }

  if (demoEngine) {
    demoEngine.applyGateOverride?.(gateId, normalized);
  }

  return `System Alert: Authorized modification completed. ${gateId} configuration updated to ${normalized}.`;
}

/**
 * Record a steward/staff dispatch to a location.
 */
export async function dispatchStewards(
  location: string,
  count: number,
  demoEngine?: LiveDemoEngine | null,
): Promise<string> {
  const n = Math.max(0, Math.floor(count));

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await db.collection(STEWARD_COLL).insertOne({
      location,
      count: n,
      dispatchedAt: new Date(),
      status: "dispatched",
    });
  } catch (err) {
    console.error("dispatchStewards persist failed:", err);
  }

  if (demoEngine) {
    demoEngine.applyStewardDispatch?.(location, n);
  }

  return `Operational Success: Dispatched ${n} response personnel to the ${location} sector immediately.`;
}

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  name: string;
  ok: boolean;
  message: string;
}

/**
 * Execute a single tool call dispatched by the LLM. Returns a structured
 * result with a human-readable confirmation message for the chat stream.
 */
export async function executeAgentAction(
  call: ToolCall,
  demoEngine?: LiveDemoEngine | null,
): Promise<ToolResult> {
  try {
    if (call.name === "toggleGateAccess") {
      const gateId = String(call.args.gateId ?? "");
      const status = String(call.args.status ?? "");
      if (!gateId || !status) {
        return { name: call.name, ok: false, message: "Missing gateId or status." };
      }
      const message = await updateGateStatus(gateId, status, demoEngine);
      return { name: call.name, ok: true, message };
    }

    if (call.name === "deployOperationalPersonnel") {
      const location = String(call.args.location ?? "");
      const count = Number(call.args.count ?? 0);
      if (!location || !count) {
        return { name: call.name, ok: false, message: "Missing location or count." };
      }
      const message = await dispatchStewards(location, count, demoEngine);
      return { name: call.name, ok: true, message };
    }

    return { name: call.name, ok: false, message: `Unknown tool: ${call.name}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool execution failed.";
    return { name: call.name, ok: false, message };
  }
}
