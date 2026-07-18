import { clientPromise, GLOBAL_SETTINGS_ID } from "@/lib/db";
import { fetchLiveMatches, Match, MatchResponse } from "./match-api";
import { logDiagnosticError } from "@/lib/logger";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";
const CACHE_COLL = "match_cache";

// Timeout after 5s — prevents hanging when MongoDB is unreachable
const FETCH_TIMEOUT = 5000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out")), ms)
  );
  return Promise.race([promise, timeout]);
}

// In-memory fallback if MongoDB is unreachable
let inMemoryCache: {
  matches: Match[];
  isMock: boolean;
  expiresAt: number;
} | null = null;

export async function getCachedMatches(): Promise<{ matches: Match[]; isMock: boolean }> {
  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db(DB_NAME);

    // 1. Fetch cache settings (TTL)
    const settings = await db.collection("settings").findOne({ _id: GLOBAL_SETTINGS_ID });
    const ttlSeconds = settings?.matchApi?.cacheTTL ?? 300; // default 5m

    // 2. Fetch cached data
    const cacheDoc = await db.collection(CACHE_COLL).findOne({ _id: "current_matches" as any });

    const now = Date.now();

    // 3. Stale-while-revalidate logic
    if (cacheDoc) {
      const isStale = cacheDoc.expiresAt <= now;
      if (isStale) {
        // Asynchronously update in the background
        (async () => {
          try {
            const fresh = await withTimeout(fetchLiveMatches(), FETCH_TIMEOUT).catch(async (err) => {
              await logDiagnosticError("MATCH_CACHE_SYNCHRONOUS_FETCH_FAILED", err);
              return Promise.resolve({ matches: [], isMock: true } as MatchResponse);
            });
            const client = await clientPromise;
            const database = client.db(DB_NAME);
            await database.collection(CACHE_COLL).updateOne(
              { _id: "current_matches" as any },
              {
                $set: {
                  matches: fresh.matches,
                  isMock: fresh.isMock,
                  expiresAt: Date.now() + ttlSeconds * 1000,
                  updatedAt: Date.now(),
                },
              },
              { upsert: true }
            );
          } catch (err) {
            await logDiagnosticError("MATCH_CACHE_BACKGROUND_REVALIDATION_FAILED", err);
          }
        })();
      }
      return { matches: cacheDoc.matches as Match[], isMock: cacheDoc.isMock ?? true };
    }

    // Cache missing completely — must fetch synchronously first time
    const fresh = await withTimeout(fetchLiveMatches(), FETCH_TIMEOUT).catch(async (err) => {
      await logDiagnosticError("MATCH_CACHE_SYNCHRONOUS_FETCH_FAILED", err);
      return Promise.resolve({ matches: [], isMock: true } as MatchResponse);
    });
    await db.collection(CACHE_COLL).updateOne(
      { _id: "current_matches" as any },
      {
        $set: {
          matches: fresh.matches,
          isMock: fresh.isMock,
          expiresAt: now + ttlSeconds * 1000,
          updatedAt: Date.now(),
        },
      },
      { upsert: true }
    );

    return { matches: fresh.matches, isMock: fresh.isMock };
  } catch (error) {
    await logDiagnosticError("MATCH_CACHE_MONGO_FETCH_FAILED", error, { fallback: "in-memory cache" });

    // Fallback to in-memory caching with Stale-while-revalidate
    const now = Date.now();
    if (inMemoryCache) {
      const isStale = inMemoryCache.expiresAt <= now;
      if (isStale) {
        // Asynchronously update memory cache
        (async () => {
          try {
            const fresh = await fetchLiveMatches();
            inMemoryCache = {
              matches: fresh.matches,
              isMock: fresh.isMock,
              expiresAt: Date.now() + 300 * 1000,
            };
          } catch (err) {
            await logDiagnosticError("MATCH_CACHE_MEMORY_BACKGROUND_REVALIDATION_FAILED", err);
          }
        })();
      }
      return { matches: inMemoryCache.matches, isMock: inMemoryCache.isMock };
    }

    // Memory cache missing — fetch synchronously
    try {
      const fresh = await fetchLiveMatches();
      inMemoryCache = {
        matches: fresh.matches,
        isMock: fresh.isMock,
        expiresAt: now + 300 * 1000,
      };
      return { matches: fresh.matches, isMock: fresh.isMock };
    } catch (fetchErr) {
      await logDiagnosticError("MATCH_CACHE_CRITICAL_MEMORY_FALLBACK", fetchErr, { inMemoryCacheAvailable: !!inMemoryCache });
      return { matches: inMemoryCache ? inMemoryCache.matches : [], isMock: true };
    }
  }
}
