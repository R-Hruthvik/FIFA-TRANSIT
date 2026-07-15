import { NextResponse } from 'next/server';
import { clientPromise } from '@/lib/db';
import { auth } from '@/lib/auth';

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";

export async function GET() {
  try {
    // Check if user is admin
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mongoClient = await clientPromise;
    const db = mongoClient.db(DB_NAME);
    const settings = await db.collection("settings").findOne({ _id: "global" as any });

    if (!settings) {
      return NextResponse.json({
        featureFlags: {
          enableRealMatchData: false,
          enableOneTap: false,
          enableHeatmapAnimation: true,
        },
        matchApi: {
          provider: "football-data",
          apiKey: null,
          cacheTTL: 300,
        },
      });
    }

    return NextResponse.json({
      featureFlags: settings.featureFlags || {},
      matchApi: settings.matchApi || {},
    });
  } catch (error) {
    console.error("Failed to fetch admin settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Check if user is admin
    const session = await auth();
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { featureFlags, matchApi } = body;

    const mongoClient = await clientPromise;
    const db = mongoClient.db(DB_NAME);

    await db.collection("settings").updateOne(
      { _id: "global" as any },
      {
        $set: {
          featureFlags,
          matchApi,
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update admin settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
