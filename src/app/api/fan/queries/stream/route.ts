/**
 * DEPRECATED — conversational + live feed consolidated into /api/agent/orchestrator.
 *
 * This SSE endpoint previously streamed fan query-log updates. It now returns
 * 410 Gone and points clients to the consolidated orchestrator (which emits
 * SSE events over a POST session-gated stream).
 */

export const runtime = "nodejs";

export async function GET() {
  return new Response(
    JSON.stringify({
      res: { status: 410 },
      error: "This endpoint is deprecated. Use POST /api/agent/orchestrator (SSE).",
      migratedTo: "/api/agent/orchestrator",
    }),
    { status: 410, headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
}
