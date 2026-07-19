import { NextResponse } from "next/server";
import { getCachedMatches } from "@/lib/match-cache";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { matches } = await getCachedMatches();
    return NextResponse.json({ matches });
  } catch (error) {
    console.error("Match API route error:", error);
    return NextResponse.json({ matches: [] }, { status: 200 });
  }
}
