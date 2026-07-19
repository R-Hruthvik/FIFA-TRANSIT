import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { nimRateLimiter } from "@/lib/rate-limiter";

// In-memory counters for tracking (reset on server restart)
let requestsTotal = 0;
let requestsFailed = 0;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "admin") {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  // Increment total requests counter for this API call
  requestsTotal++;

  const stats = {
    tokensAvailable: nimRateLimiter.available(),
    capacity: 20, // Hard budget from rate-limiter.ts
    usageLastMinute: 20 - nimRateLimiter.available(),
    requestsTotal,
    requestsFailed,
  };

  return Response.json(stats);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "admin") {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  // Allow admin to reset counters
  try {
    const body = await req.json();
    if (body.reset === true) {
      requestsTotal = 0;
      requestsFailed = 0;
      return Response.json({ success: true, message: "Counters reset" });
    }
  } catch {
    // Ignore parse errors
  }

  return Response.json({ error: "Invalid request" }, { status: 400 });
}
