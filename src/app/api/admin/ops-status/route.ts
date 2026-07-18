/**
 * GET /api/admin/ops-status — Latest autonomous operations loop status.
 *
 * Surfaces the most recent ops-agent run + latest steward deployment so the
 * admin console can show the background AI agent is actively tracking and
 * protecting stadium safety thresholds.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { clientPromise } from "@/lib/db";

export const runtime = "nodejs";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";

export async function GET() {
  const session = await auth().catch(() => null);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);

    const [latestRun, latestDeployment] = await Promise.all([
      db
        .collection("ops_agent_runs")
        .find({})
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray(),
      db
        .collection("steward_deployments")
        .find({})
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray(),
    ]);

    return NextResponse.json({
      latestRun: latestRun[0] ?? null,
      latestDeployment: latestDeployment[0] ?? null,
    });
  } catch (error) {
    console.error("ops-status error:", error);
    return NextResponse.json(
      { error: "Failed to load ops status" },
      { status: 500 },
    );
  }
}
