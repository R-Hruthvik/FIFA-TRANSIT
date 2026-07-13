import { clientPromise } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  let isActive = true;

  const stream = new ReadableStream({
    async start(controller) {
      let lastCheck = Date.now();

      // Send initial heartbeat
      controller.enqueue(encoder.encode(`: heartbeat\n\n`));

      const poll = async () => {
        while (isActive) {
          try {
            const client = await clientPromise;
            const db = client.db(process.env.MONGODB_DB || "stadium_ops");
            const logs = await db
              .collection("query_logs")
              .find({ timestamp: { $gt: new Date(lastCheck) } })
              .sort({ timestamp: -1 })
              .limit(20)
              .toArray();

            if (logs.length > 0) {
              const payload = JSON.stringify({ logs });
              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }

            lastCheck = Date.now();
          } catch (err) {
            console.error("SSE poll error:", err);
          }

          // Wait 2 seconds between polls
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      };

      // Start polling in background
      poll().catch(() => {});
    },
    cancel() {
      // Client disconnected — stop polling
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
