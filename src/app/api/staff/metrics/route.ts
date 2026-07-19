export const runtime = "nodejs";
import { NextResponse } from 'next/server';
import { clientPromise } from '@/lib/db';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('stadium_ops');
    const logs = await db
      .collection('query_logs')
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    const counts = {
      gate1: 0,
      gate2: 0,
      gate3: 0,
      gate4: 0,
      gate5: 0,
      gate6: 0,
      gate7: 0,
      gate8: 0,
    };

    const regex1 = /Gate (G1|1)/i;
    const regex2 = /Gate (G2|2)/i;
    const regex3 = /Gate (G3|3)/i;
    const regex4 = /Gate (G4|4)/i;
    const regex5 = /Gate (G5|5)/i;
    const regex6 = /Gate (G6|6)/i;
    const regex7 = /Gate (G7|7)/i;
    const regex8 = /Gate (G8|8)/i;

    logs.forEach((log) => {
      const text = log.text || "";
      if (regex1.test(text)) counts.gate1++;
      if (regex2.test(text)) counts.gate2++;
      if (regex3.test(text)) counts.gate3++;
      if (regex4.test(text)) counts.gate4++;
      if (regex5.test(text)) counts.gate5++;
      if (regex6.test(text)) counts.gate6++;
      if (regex7.test(text)) counts.gate7++;
      if (regex8.test(text)) counts.gate8++;
    });

    const getStatus = (hits: number): "low" | "medium" | "high" => {
      if (hits >= 6) return "high";
      if (hits >= 3) return "medium";
      return "low";
    };

    const totalHits = Object.values(counts).reduce((a, b) => a + b, 0);
    if (totalHits === 0) {
      return NextResponse.json({ metrics: null, totalLogsAnalyzed: 0 });
    }

    return NextResponse.json({
      metrics: {
        gate1: getStatus(counts.gate1),
        gate2: getStatus(counts.gate2),
        gate3: getStatus(counts.gate3),
        gate4: getStatus(counts.gate4),
        gate5: getStatus(counts.gate5),
        gate6: getStatus(counts.gate6),
        gate7: getStatus(counts.gate7),
        gate8: getStatus(counts.gate8),
      },
      totalLogsAnalyzed: logs.length,
    });
  } catch (error) {
    console.error("Metrics API error:", error);
    return NextResponse.json({
      metrics: null,
      totalLogsAnalyzed: 0,
    });
  }
}
