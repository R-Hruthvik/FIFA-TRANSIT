/**
 * DEPRECATED — single AI agent gateway now lives at /api/agent/orchestrator.
 *
 * This endpoint previously provided the staff agentic copilot (tool calling
 * for gate overrides + steward dispatch). It now returns 410 Gone and points
 * clients to the consolidated orchestrator, which enforces the same
 * privilege scoping for staff/admin roles.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  return NextResponse.json(
    {
      res: { status: 410 },
      error: "This endpoint is deprecated. Use POST /api/agent/orchestrator.",
      migratedTo: "/api/agent/orchestrator",
    },
    { status: 410 },
  );
}
