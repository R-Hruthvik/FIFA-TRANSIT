import { NextResponse } from 'next/server';
import { clientPromise, GLOBAL_SETTINGS_ID } from '@/lib/db';
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
    const settings = await db.collection("settings").findOne({ _id: GLOBAL_SETTINGS_ID });

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
        gateOverrides: {},
      });
    }

    return NextResponse.json({
      featureFlags: settings.featureFlags || {},
      matchApi: settings.matchApi || {},
      // Autonomous ops agent writes gate overrides here; default to an empty
      // matrix so the client can always safely map over the entries.
      gateOverrides: settings.gateOverrides || {},
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
    const { featureFlags, matchApi, gateOverrides, clearGateId } = body;

    const mongoClient = await clientPromise;
    const db = mongoClient.db(DB_NAME);

    // Surgical clear: strip a single AI gate override without read-modify-write
    // on the whole settings wrapper (avoids clobbering concurrent agent writes).
    if (clearGateId) {
      await db.collection("settings").updateOne(
        { _id: GLOBAL_SETTINGS_ID },
        { $unset: { [`gateOverrides.${clearGateId}`]: "" } }
      );
      return NextResponse.json({ success: true });
    }

    const setFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (featureFlags !== undefined) setFields.featureFlags = featureFlags;
    if (matchApi !== undefined) setFields.matchApi = matchApi;
    // Allow admins to clear or update the full gateOverrides matrix (e.g.
    // resetting an AI-restricted gate back to standard manual operation).
    if (gateOverrides !== undefined) setFields.gateOverrides = gateOverrides;

    await db.collection("settings").updateOne(
      { _id: GLOBAL_SETTINGS_ID },
      { $set: setFields },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update admin settings:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
