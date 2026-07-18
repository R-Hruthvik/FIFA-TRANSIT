/**
 * GET /api/track/plan — Generate or retrieve a user's egress plan
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D6 — GenAI = per-user contextual reasoning
 * D7 — Headline feature = post-match egress orchestration
 * D8-B — Compute-once + cache-on-device
 * D9 — Below confidence threshold → defer to stewards
 *
 * Query params:
 *   position: JSON string of user's last known position
 *   lang: BCP-47 language tag (default: "en")
 *   egress: "true" if match has ended
 *   version: client's cached plan version (for invalidation)
 *
 * Response:
 *   { plan: EgressPlan, version: number }
 */

import { NextResponse } from "next/server";
import { aggregateCrowd } from "@/lib/crowd-aggregator";
import { generateEgressPlan, parseUserPosition } from "@/lib/egress-planner";
import { enhancePlanWithAI } from "@/lib/egress-ai";
import { computeAgenticTransitRoute } from "@/lib/maps-agent";
import type { EgressPlan } from "@/types/position";

// ── Server-side version counter ────────────────────────────────────────
// In production, this would be tied to gate_crowd update timestamps.
// For now, we increment it on each generation.

let planVersion = 1;

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const positionParam = url.searchParams.get("position");
    const language = url.searchParams.get("lang") || "en";
    const egressMode = url.searchParams.get("egress") === "true";
    const clientVersion = url.searchParams.get("version");

    // Parse user position
    let userPosition: unknown = null;
    if (positionParam) {
      try {
        userPosition = JSON.parse(positionParam);
      } catch {
        userPosition = null;
      }
    }

    // If client version matches server, return 304 (not modified)
    // In production, this prevents unnecessary plan regeneration
    if (clientVersion && parseInt(clientVersion, 10) === planVersion) {
      return new NextResponse(null, { status: 304 });
    }

    // 1. Get current gate crowd data
    const { gateCrowds } = await aggregateCrowd();

    // 2. Generate the egress plan
    const result = generateEgressPlan({
      userPosition,
      gateCrowds,
      language,
      now: Date.now(),
      matchEnded: egressMode,
    });

    if (!result.plan) {
      return NextResponse.json({
        plan: null,
        deferred: true,
        reason: result.reason,
        version: planVersion,
      });
    }

    // 3. Stamp the plan with userId (from request headers in production)
    // For demo, we use a session-based or anonymous id
    const userId = request.headers.get("x-user-id") || "anonymous";

    let plan: EgressPlan = {
      ...result.plan,
      userId,
      version: planVersion,
    };

    // 4. Enhance with AI (D6) — generate natural language from context
    // If AI fails, the structured fallback instruction is already in place.
    if (!plan.deferToStewards) {
      try {
        // 4a. Traffic-aware maps agent: override the instruction with
        // real-world transit + gate-congestion grounded guidance.
        const fanOriginCoordinates = positionParam || "";
        const agenticGuidance = await computeAgenticTransitRoute(
          fanOriginCoordinates,
          `${plan.gateId} transit hub`,
          gateCrowds,
        );
        if (agenticGuidance !== null) {
          // Live GPS route grounding succeeded — override with traffic-aware guidance.
          plan = { ...plan, instruction: agenticGuidance };
        } else {
          // Guard returned null (no valid lat/lng) — proceed to standard local enhancement.
          plan = await enhancePlanWithAI(plan, gateCrowds, userPosition);
        }
      } catch (err) {
        console.error("AI enhancement failed, using fallback:", err);
        // Keep the template-based instruction from generateEgressPlan
      }
    }

    return NextResponse.json({ plan, version: planVersion });
  } catch (error) {
    console.error("Egress plan generation error:", error);
    return NextResponse.json(
      {
        plan: null,
        deferred: true,
        reason: "Unable to generate egress plan. Please follow steward directions.",
        version: planVersion,
      },
      { status: 200 },
    );
  }
}

/**
 * POST /api/track/plan — Batch generate plans for many users
 *
 * Used by staff dashboard to run the stagger algorithm (D10).
 * Body: { users: UserEarliest[], matchEndTime: number }
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { users, matchEndTime } = body as {
      users: Array<{
        userId: string;
        position: unknown;
        etaToGate: Record<string, number>;
        earliestArrival: Record<string, number>;
        language?: string;
      }>;
      matchEndTime: number;
    };

    if (!Array.isArray(users) || !matchEndTime) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const { gateCrowds } = await aggregateCrowd();

    // Import stagger algorithm
    const { staggerEgress } = await import("@/lib/egress-stagger");

    const staggerInput = users.map((u) => ({
      userId: u.userId,
      etaToGate: u.etaToGate,
      earliestArrival: u.earliestArrival,
      language: u.language,
    }));

    const result = staggerEgress(staggerInput, gateCrowds, matchEndTime);

    return NextResponse.json({
      assignments: result.assignments,
      deferredCount: result.deferredCount,
      totalEgressMinutes: result.totalEgressMinutes,
    });
  } catch (error) {
    console.error("Batch plan generation error:", error);
    return NextResponse.json({ error: "Batch plan generation failed" }, { status: 500 });
  }
}
