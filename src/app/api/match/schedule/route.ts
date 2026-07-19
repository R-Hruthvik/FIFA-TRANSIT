import { NextResponse } from "next/server";
import { getCachedMatches } from "@/lib/match-cache";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { matches } = await getCachedMatches();
    const schedule = matches.filter((m) => m.status === "scheduled");
    return NextResponse.json({ schedule });
  } catch (error) {
    console.error("Match schedule API route error:", error);
    return NextResponse.json({ error: "Failed to fetch match schedule" }, { status: 500 });
  }
}
