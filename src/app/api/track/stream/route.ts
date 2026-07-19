/**
 * GET /api/track/stream — SSE stream of gate crowd updates
 *
 * Design reference: Design-20260713-production-realtime-tracking.md
 * D4 — Backend = stateless aggregate-on-read + change-stream push (SSE becomes event-driven)
 * D8 — Live server-push reroute if network holds
 *
 * Streams:
 *  - gate_crowd updates (every poll cycle, if changed)
 *  - critical alerts when any gate exceeds threshold (D9)
 *  - egress plan updates when crowd conditions change
 *
 * Uses the existing polling pattern from the fan queries stream.
 * In production, replace with MongoDB change streams for true event-driven push.
 *
 * Events:
 *   data: { type: "crowd_update", gates: GateCrowd[] }
 *   data: { type: "alert", message: string, gateId?: string }
 *   data: { type: "egress_plan", plan: EgressPlan }
 */

import { NextResponse } from "next/server";
import { clientPromise } from "@/lib/db";
import { aggregateCrowd, hasCriticalGates } from "@/lib/crowd-aggregator";
import { aggregateClusters } from "@/lib/crowd-clusters";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";
const POLL_INTERVAL_MS = 2_000;

export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  let isActive = true;
  const lastGateCounts: Record<string, number> = {};

  // Helper to send SSE event
  const sendEvent = (controller: ReadableStreamDefaultController, data: unknown) => {
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      // Stream closed
    }
  };

  // Helper to send heartbeat (keeps connection alive through proxies)
  const sendHeartbeat = (controller: ReadableStreamDefaultController) => {
    try {
      controller.enqueue(encoder.encode(`: heartbeat\n\n`));
    } catch {
      // Stream closed
    }
  };

  const stream = new ReadableStream({
    async start(controller) {
       // Send initial state
       try {
         const { gateCrowds, clusters } = await aggregateCrowd();
         for (const gc of gateCrowds) {
           lastGateCounts[gc.gateId] = gc.count;
         }
         sendEvent(controller, { type: "crowd_update", gates: gateCrowds, clusters });
       } catch {
         // Ignore initial fetch errors
       }

      // Polling loop
      const poll = async () => {
        let errorLogged = false;
        while (isActive) {
          let currentInterval = POLL_INTERVAL_MS;
          try {
            const { gateCrowds } = await aggregateCrowd();
            errorLogged = false;

            // Check for changes
            let changed = false;
            for (const gc of gateCrowds) {
              if (lastGateCounts[gc.gateId] !== gc.count) {
                changed = true;
                lastGateCounts[gc.gateId] = gc.count;
              }
            }

            if (changed) {
               const clusters = await aggregateClusters();
               sendEvent(controller, { type: "crowd_update", gates: gateCrowds, clusters });
             }

            // Check for critical gates (D9 alert)
            const critical = gateCrowds.filter(
              (gc) => gc.count / gc.capacityThreshold >= 0.8,
            );
            if (critical.length > 0) {
              for (const gc of critical) {
                sendEvent(controller, {
                  type: "alert",
                  message: `${gc.gateId} is at ${Math.round((gc.count / gc.capacityThreshold) * 100)}% capacity`,
                  gateId: gc.gateId,
                  severity: "critical",
                });
              }
            }

            // Check for low-confidence gates (D9)
            const lowConf = gateCrowds.filter((gc) => gc.confidence < 0.35);
            if (lowConf.length > 0) {
              const gateIds = lowConf.map((g) => g.gateId).join(", ");
              sendEvent(controller, {
                type: "alert",
                message: `Low crowd data confidence at: ${gateIds}. Following steward directions.`,
                severity: "warning",
              });
            }
          } catch (err) {
            const errObj = err as Record<string, unknown> | null;
            const errorName = typeof errObj?.name === 'string' ? errObj.name : '';
            const errorMessage = typeof errObj?.message === 'string' ? errObj.message : String(err);
            const isMongoError = 
              errorName === "MongoServerSelectionError" || 
              errorName === "MongoNetworkError" ||
              errorMessage.includes("ENOTFOUND") || 
              errorMessage.includes("MongoNetworkError");
            
            if (isMongoError) {
              if (!errorLogged) {
                console.error("MongoDB unreachable — suppressing further logs.");
                errorLogged = true;
              }
              currentInterval = 10_000; // Backoff to 10s
            } else {
              console.error("SSE poll error:", err);
            }
          }

          sendHeartbeat(controller);
          await new Promise((resolve) => setTimeout(resolve, currentInterval));
        }
      };

      poll().catch(() => {});
    },
    cancel() {
      isActive = false;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
