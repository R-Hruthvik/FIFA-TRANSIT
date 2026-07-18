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
        let errorLogged = false;
        while (isActive) {
          let currentInterval = 2000;
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
            errorLogged = false;
          } catch (err) {
            const errorName = err && typeof err === 'object' ? (err as any).name : '';
            const errorMessage = err && typeof err === 'object' ? (err as any).message || '' : String(err);
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

          // Wait between polls
          await new Promise((resolve) => setTimeout(resolve, currentInterval));
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
