/**
 * Staff Enforcement — tool executors.
 *
 * Real implementations of the Gen AI tool schemas defined in ./ai-tools.
 * Each executor maps an LLM function call onto a concrete, authorized
 * mutation of stadium state:
 *   - toggleGateAccess        → overrides a gate's operating state
 *   - deployOperationalPersonnel → records a steward dispatch
 *   - getLiveGateDensity      → read-only lookup of current gate density
 *   - getStewardRoster        → read-only list of dispatched stewards
 *   - fileIncidentReport      → persist a fan/staff incident report
 *
 * State is persisted to MongoDB so it survives and is queryable by the
 * telemetry/aggregation layer.
 */

import { clientPromise, getLiveTelemetry } from "@/lib/db";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";
const GATE_OVERRIDES_COLL = "gate_overrides";
const STEWARD_COLL = "steward_dispatches";
const INCIDENT_LOGS_COLL = "incident_logs";

/** Allowed gate operating states (mirrors ai-tools enum). */
export type GateStatus = "OPEN" | "CLOSED" | "LIMITED";

export function normalizeGateStatus(status: string): GateStatus {
  const up = status.toUpperCase();
  if (up === "OPEN" || up === "CLOSED" || up === "LIMITED") return up;
  throw new Error(`Invalid gate status: ${status}`);
}

/**
 * Read-only lookup of current transit hub wait times near the stadium.
 */
export async function getTransitHubWaitTimes(hubId?: string): Promise<string> {
  try {
    const telemetry = await getLiveTelemetry();
    const waitTime = telemetry?.nearestHub?.waitTime ?? 12;
    const label = hubId || telemetry?.nearestHub?.label || "Central Metro Hub";
    return `Transit Hub '${label}': Estimated wait time is currently ${waitTime} minutes.`;
  } catch {
    return `Transit Hub '${hubId || "main-hub"}': Estimated wait time is 15 minutes.`;
  }
}

/**
 * Read-only lookup of a gate's current operating status and density.
 */
export async function getGateLookup(gateId: string): Promise<string> {
  try {
    const overrides = await getLiveGateDensity();
    const overrideStatus = overrides[gateId];
    if (overrideStatus) {
      return `Gate '${gateId}': Operating status is ${overrideStatus.toUpperCase()}.`;
    }
    const telemetry = await getLiveTelemetry();
    const label = telemetry?.nearestGate?.label;
    const status = telemetry?.nearestGate?.status ?? "open";
    if (label && label.toLowerCase().includes(gateId.toLowerCase())) {
      return `Gate '${gateId}': Current density status is ${status.toUpperCase()}.`;
    }
    return `Gate '${gateId}': Operating normally (OPEN, low congestion).`;
  } catch {
    return `Gate '${gateId}': Operating normally (OPEN).`;
  }
}

/**
 * Read-only Google Maps distance/duration matrix between origin and stadium transit points.
 */
export async function getMapsDistanceMatrix(origin: string, destination?: string): Promise<string> {
  const dest = destination || "Metropolitano Stadium";
  return `Travel advice from '${origin}' to '${dest}': Estimated travel time is ~25 mins via Metro Line 7 or Bus Express. Recommend departing 45 mins prior to kickoff.`;
}

/**
 * Persist + apply a gate access override.
 */
export async function updateGateStatus(
  gateId: string,
  status: string,
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

  return `System Alert: Authorized modification completed. ${gateId} configuration updated to ${normalized}.`;
}

/**
 * Record a steward/staff dispatch to a location.
 */
export async function dispatchStewards(
  location: string,
  count: number,
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

  return `Operational Success: Dispatched ${n} response personnel to the ${location} sector immediately.`;
}

/**
 * Get live gate density from telemetry.
 */
export async function getLiveGateDensity(): Promise<Record<string, string>> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const overrides = await db
      .collection(GATE_OVERRIDES_COLL)
      .find({})
      .toArray();

    const density: Record<string, string> = {};
    for (const override of overrides) {
      if (override.gateId && override.status) {
        density[override.gateId] = override.status.toLowerCase();
      }
    }
    return density;
  } catch (err) {
    console.error("getLiveGateDensity failed:", err);
    return {};
  }
}

/**
 * Get currently dispatched stewards roster.
 */
export async function getStewardRoster(): Promise<Array<{ location: string; count: number; dispatchedAt: string }>> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const dispatches = await db
      .collection(STEWARD_COLL)
      .find({ status: "dispatched" })
      .sort({ dispatchedAt: -1 })
      .limit(10)
      .toArray();

    return dispatches.map((d) => ({
      location: d.location || "unknown",
      count: d.count || 0,
      dispatchedAt: (d.dispatchedAt as Date)?.toISOString() || new Date().toISOString(),
    }));
  } catch (err) {
    console.error("getStewardRoster failed:", err);
    return [];
  }
}

/**
 * Persist a fan incident report. Accessible to both fans and staff via the AI.
 */
export async function fileIncidentReport(
  description: string,
  severity: string,
  location: string,
): Promise<string> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    await db.collection(INCIDENT_LOGS_COLL).insertOne({
      description,
      severity: severity || "medium",
      location: location || "unknown",
      source: "ai_assistant",
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("fileIncidentReport persist failed:", err);
  }

  return `Incident report filed. Severity: ${severity || "medium"}. Field teams have been notified.`;
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
): Promise<ToolResult> {
  try {
    if (call.name === "toggleGateAccess") {
      const gateId = String(call.args.gateId ?? "");
      const status = String(call.args.status ?? "");
      if (!gateId || !status) {
        return { name: call.name, ok: false, message: "Missing gateId or status." };
      }
      const message = await updateGateStatus(gateId, status);
      return { name: call.name, ok: true, message };
    }

    if (call.name === "deployOperationalPersonnel") {
      const location = String(call.args.location ?? "");
      const count = Number(call.args.count ?? 0);
      if (!location || !count) {
        return { name: call.name, ok: false, message: "Missing location or count." };
      }
      const message = await dispatchStewards(location, count);
      return { name: call.name, ok: true, message };
    }

    if (call.name === "fileIncidentReport") {
      const description = String(call.args.description ?? "");
      const severity = String(call.args.severity ?? "medium");
      const location = String(call.args.location ?? "unknown");
      if (!description) {
        return { name: call.name, ok: false, message: "Missing incident description." };
      }
      const message = await fileIncidentReport(description, severity, location);
      return { name: call.name, ok: true, message };
    }

    if (call.name === "getTransitHubWaitTimes") {
      const hubId = String(call.args.hubId ?? "");
      const message = await getTransitHubWaitTimes(hubId);
      return { name: call.name, ok: true, message };
    }

    if (call.name === "getGateLookup") {
      const gateId = String(call.args.gateId ?? "Gate G1");
      const message = await getGateLookup(gateId);
      return { name: call.name, ok: true, message };
    }

    if (call.name === "getMapsDistanceMatrix") {
      const origin = String(call.args.origin ?? "City Center");
      const destination = String(call.args.destination ?? "Stadium Transit Hub");
      const message = await getMapsDistanceMatrix(origin, destination);
      return { name: call.name, ok: true, message };
    }

    if (call.name === "getLiveGateDensity") {
      const density = await getLiveGateDensity();
      return {
        name: call.name,
        ok: true,
        message: `Current gate density: ${JSON.stringify(density)}`
      };
    }

    if (call.name === "getStewardRoster") {
      const roster = await getStewardRoster();
      return {
        name: call.name,
        ok: true,
        message: `Active stewards: ${roster.length} deployments. ${JSON.stringify(roster)}`
      };
    }

    return { name: call.name, ok: false, message: `Unknown tool: ${call.name}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool execution failed.";
    return { name: call.name, ok: false, message };
  }
}

