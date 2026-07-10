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
      gateA: 0,
      gateB: 0,
      gateC: 0,
      gateD: 0,
    };

    const regexA = /Gate A/i;
    const regexB = /Gate B/i;
    const regexC = /Gate C/i;
    const regexD = /Gate D/i;

    logs.forEach((log) => {
      const text = log.text || "";
      if (regexA.test(text)) counts.gateA++;
      if (regexB.test(text)) counts.gateB++;
      if (regexC.test(text)) counts.gateC++;
      if (regexD.test(text)) counts.gateD++;
    });

    const getStatus = (hits: number): "low" | "medium" | "high" => {
      if (hits >= 6) return "high";
      if (hits >= 3) return "medium";
      return "low";
    };

    return NextResponse.json({
      metrics: {
        gateA: getStatus(counts.gateA),
        gateB: getStatus(counts.gateB),
        gateC: getStatus(counts.gateC),
        gateD: getStatus(counts.gateD),
      },
      totalLogsAnalyzed: logs.length,
    });
  } catch (error) {
    console.error("Metrics API error:", error);
    return NextResponse.json({
      metrics: {
        gateA: "low",
        gateB: "low",
        gateC: "low",
        gateD: "low",
      },
      totalLogsAnalyzed: 0,
    });
  }
}
