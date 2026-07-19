import { clientPromise, GLOBAL_SETTINGS_ID } from "@/lib/db";
import { fetchLiveMatches, Match } from "./match-api";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";
const CACHE_COLL = "match_cache";
const FETCH_TIMEOUT = 5000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Match fetch timed out")), ms),
  );
  return Promise.race([promise, timeout]);
}

export async function getCachedMatches(): Promise<{ matches: Match[] }> {
  const mongoClient = await clientPromise;
  const db = mongoClient.db(DB_NAME);

  const settings = await db.collection("settings").findOne({ _id: GLOBAL_SETTINGS_ID });
  const ttlSeconds = settings?.matchApi?.cacheTTL ?? 300;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cacheDoc = await db.collection(CACHE_COLL).findOne({ _id: "current_matches" as any });

  const now = Date.now();

  if (cacheDoc && cacheDoc.expiresAt > now) {
    return { matches: cacheDoc.matches as Match[] };
  }

  const fresh = await withTimeout(fetchLiveMatches(), FETCH_TIMEOUT);

  await db.collection(CACHE_COLL).updateOne(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    { _id: "current_matches" as any },
    {
      $set: {
        matches: fresh.matches,
        expiresAt: now + ttlSeconds * 1000,
        updatedAt: now,
      },
    },
    { upsert: true },
  );

  return { matches: fresh.matches };
}
