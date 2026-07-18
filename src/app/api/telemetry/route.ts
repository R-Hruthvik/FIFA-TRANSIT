import { NextResponse } from 'next/server';
import { getLiveTelemetry } from '@/lib/db';

export const runtime = "nodejs";

export async function GET() {
  try {
    const telemetry = await getLiveTelemetry();
    return NextResponse.json(telemetry);
  } catch (error) {
    console.error("Telemetry API error:", error);
    return NextResponse.json({
      nearestGate: { label: "Awaiting Live Stream Scan...", status: "closed" },
      nearestHub: { label: "Establishing connection...", waitTime: 0 },
      weatherAdvisory: { label: "Fetching operational status...", condition: "clear" }
    });
  }
}
