/**
 * Seed script: create or promote an admin user + initial settings document.
 *
 * Usage:
 *   npx ts-node scripts/seed-admin.ts <email> [name]
 *
 * This is a ONE-TIME SETUP SCRIPT for production deployment. After running,
 * the user can sign in with their Google account and access /admin.
 */

import { clientPromise, GLOBAL_SETTINGS_ID } from "../src/lib/db";
import { createUser, findUserByEmail, updateUserRole } from "../src/lib/auth/users";
import { randomUUID } from "crypto";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx ts-node scripts/seed-admin.ts <email> [name]");
    process.exit(1);
  }
  const name = process.argv[3] || "Admin";

  const client = await clientPromise;
  const db = client.db(DB_NAME);

  // 1. Find or create user
  let user = await findUserByEmail(email);
  if (user) {
    console.log(`Found existing user: ${user.id}`);
    await updateUserRole(user.id, "admin");
    console.log(`Promoted ${email} → admin`);
  } else {
    user = await createUser({
      id: randomUUID(),
      email,
      name,
      emailVerified: null,
      image: null,
      googleId: null,
      passwordHash: null,
      role: "admin",
      staffStatus: "approved",
      staffRequestedAt: null,
      approvedAt: null,
      approvedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignIn: null,
    });
    console.log(`Created admin user: ${user.id}`);
  }

  // 2. Upsert default settings document
  const existingSettings = await db.collection("settings").findOne({ _id: GLOBAL_SETTINGS_ID });
  const now = new Date();

  const defaults = {
    _id: GLOBAL_SETTINGS_ID,
    venue: {
      name: "Lusail Stadium",
      lat: 25.4208,
      lng: 51.4907,
      gates: [
        { id: "Gate A", x: 450, y: 120, capacity: 8000, label: "North Main" },
        { id: "Gate B", x: 150, y: 300, capacity: 6000, label: "West Wing" },
        { id: "Gate C", x: 750, y: 300, capacity: 6000, label: "East Wing" },
        { id: "Gate D", x: 450, y: 480, capacity: 5000, label: "South End" },
      ],
      threshold: { green: 50, yellow: 75 },
    },
    featureFlags: {
      enableRealMatchData: false,
      enableOneTap: false,
      enableHeatmapAnimation: true,
    },
    matchApi: {
      provider: "football-data",
    },
    mapsApi: {
      provider: "google-maps",
    },
    aiProvider: {
      provider: "nvidia-nim",
      model: "meta/llama-3.3-70b-instruct",
    },
    transitHubs: [
      {
        id: "hub-lusail-metro",
        name: "Lusail Metro Station",
        lat: 25.423,
        lng: 51.488,
        waitTimeMinutes: 5,
        crowdLevel: "low",
      },
      {
        id: "hub-lusail-bus",
        name: "Lusail Bus Terminal",
        lat: 25.418,
        lng: 51.495,
        waitTimeMinutes: 8,
        crowdLevel: "low",
      },
      {
        id: "hub-parking-a",
        name: "Parking Zone A",
        lat: 25.426,
        lng: 51.485,
        waitTimeMinutes: 10,
        crowdLevel: "low",
      },
    ],
    updatedAt: now,
  };

  if (existingSettings) {
    // Merge — preserve existing env-bound fields and update defaults
    await db.collection("settings").updateOne(
      { _id: GLOBAL_SETTINGS_ID },
      { $set: { ...defaults, updatedAt: now } },
    );
    console.log("Updated existing settings document");
  } else {
    await db.collection("settings").insertOne(defaults);
    console.log("Created initial settings document");
  }

  console.log("\n✅ Seed complete!");
  console.log(`   Admin email: ${email}`);
  console.log(`   Sign in at:  <your-vercel-url>/auth/login`);
  console.log(`   Then visit:  <your-vercel-url>/admin`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
