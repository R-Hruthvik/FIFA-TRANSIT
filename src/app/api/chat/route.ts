/**
 * DEPRECATED — single AI agent gateway now lives at /api/agent/orchestrator.
 *
 * This endpoint previously handled dual-persona chat (MIRI/TORQUE) via
 * NVIDIA NIM with a Gemini fallback. It now returns 410 Gone and points
 * clients to the consolidated orchestrator.
 */

export const runtime = "nodejs";

export async function POST(): Promise<Response> {
  return new Response(
    JSON.stringify({
      res: { status: 410 },
      error: "This endpoint is deprecated. Use POST /api/agent/orchestrator.",
      migratedTo: "/api/agent/orchestrator",
    }),
    { status: 410, headers: { "Content-Type": "application/json; charset=utf-8" } },
  );
}
