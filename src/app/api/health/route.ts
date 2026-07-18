import { NextResponse } from "next/server";
import { clientPromise } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const start = Date.now();

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "stadium_ops");

    // Fast ping — just check connection
    await db.admin().ping();

    const latency = Date.now() - start;

    return NextResponse.json({
      status: "ok",
      db: "connected",
      latencyMs: latency,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const latency = Date.now() - start;

    return NextResponse.json(
      {
        status: "degraded",
        db: "unreachable",
        latencyMs: latency,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
