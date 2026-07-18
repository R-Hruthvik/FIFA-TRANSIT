import { NextResponse } from "next/server";
import { getCachedMatches } from "@/lib/match-cache";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { matches, isMock } = await getCachedMatches();
    return NextResponse.json({ matches, isMock });
  } catch (error) {
    console.error("Match API route error:", error);
    return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 });
  }
}
