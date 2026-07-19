/**
 * Shared gate-metrics aggregation used by the AI agent endpoints.
 *
 * Mirrors the logic historically embedded in /api/chat: scans recent
 * query_logs to estimate per-gate congestion levels. Returns null on any
 * failure so callers can gracefully degrade.
 */

import { clientPromise } from "@/lib/db";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";

export type GateDensity = "low" | "medium" | "high";

export async function getGateMetrics(): Promise<Record<string, string> | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const logs = (await db
      .collection("query_logs")
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray()) as Array<{ text?: string }>;

    const counts: Record<string, number> = {
      gate1: 0, gate2: 0, gate3: 0, gate4: 0,
      gate5: 0, gate6: 0, gate7: 0, gate8: 0,
    };

    logs.forEach((log) => {
      const text = log.text || "";
      if (/Gate (G1|1)/i.test(text)) counts.gate1++;
      if (/Gate (G2|2)/i.test(text)) counts.gate2++;
      if (/Gate (G3|3)/i.test(text)) counts.gate3++;
      if (/Gate (G4|4)/i.test(text)) counts.gate4++;
      if (/Gate (G5|5)/i.test(text)) counts.gate5++;
      if (/Gate (G6|6)/i.test(text)) counts.gate6++;
      if (/Gate (G7|7)/i.test(text)) counts.gate7++;
      if (/Gate (G8|8)/i.test(text)) counts.gate8++;
    });

    const getStatus = (hits: number): GateDensity => {
      if (hits >= 6) return "high";
      if (hits >= 3) return "medium";
      return "low";
    };

    return {
      "Gate G1": getStatus(counts.gate1),
      "Gate G2": getStatus(counts.gate2),
      "Gate G3": getStatus(counts.gate3),
      "Gate G4": getStatus(counts.gate4),
      "Gate G5": getStatus(counts.gate5),
      "Gate G6": getStatus(counts.gate6),
      "Gate G7": getStatus(counts.gate7),
      "Gate G8": getStatus(counts.gate8),
    };
  } catch {
    return null;
  }
}
