import { NextResponse } from 'next/server';
import { getLatestLogs } from '@/lib/db';

export const runtime = "nodejs";

export async function GET() {
  try {
    const logs = await getLatestLogs(5);
    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Fan queries API error:", error);
    return NextResponse.json({ logs: [] });
  }
}
