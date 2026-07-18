import { NextResponse } from "next/server";
import { clientPromise } from "@/lib/db";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";

export const runtime = "nodejs";

export async function GET() {
  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db(DB_NAME);
    const settings = await db.collection("settings").findOne({ _id: "global" as any });

    const defaultFlags = {
      enableRealMatchData: false,
      enableOneTap: false,
      enableHeatmapAnimation: true,
    };

    const featureFlags = settings?.featureFlags || defaultFlags;

    return NextResponse.json({
      featureFlags,
      googleClientId: process.env.GOOGLE_CLIENT_ID || "",
    });
  } catch (error) {
    console.error("Failed to fetch config:", error);
    return NextResponse.json({
      featureFlags: {
        enableRealMatchData: false,
        enableOneTap: false,
        enableHeatmapAnimation: true,
      },
      googleClientId: "",
    });
  }
}
