import { MongoClient } from 'mongodb';
import type { StadiumTelemetry } from '@/types/telemetry';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('Please add your Mongo URI to .env');

const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

const DB_NAME = process.env.MONGODB_DB || 'stadium_ops';
const TELEMETRY_COLL = process.env.MONGODB_TELEMETRY_COLLECTION || 'telemetry';
const LOGS_COLL = process.env.MONGODB_LOGS_COLLECTION || 'query_logs';
export const USERS_COLL = process.env.MONGODB_USERS_COLLECTION || 'users';

export { clientPromise };

const DEFAULT_TELEMETRY: StadiumTelemetry = {
  nearestGate: { label: "NO DATA", status: "open" as const },
  nearestHub: { label: "NO DATA", waitTime: 0 },
  weatherAdvisory: { label: "NO DATA", condition: "clear" as const },
};

export type { StadiumTelemetry, StadiumTelemetry as StadiumState } from '@/types/telemetry';

export async function getUserCollection() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection(USERS_COLL);
}

export async function getLiveTelemetry(): Promise<StadiumTelemetry> {
  try {
    // Timeout after 500ms to prevent hanging
    const timeoutPromise = new Promise<StadiumTelemetry>((resolve) => {
      setTimeout(() => resolve(DEFAULT_TELEMETRY), 500);
    });

    const telemetryPromise = (async (): Promise<StadiumTelemetry> => {
      const client = await clientPromise;
      const db = client.db(DB_NAME);
      const telemetry = db.collection(TELEMETRY_COLL);
      const data = await telemetry.findOne({}, { sort: { _id: -1 } });
      return (data as unknown as StadiumTelemetry) || DEFAULT_TELEMETRY;
    })();

    // Race: whoever resolves first wins
    return await Promise.race([telemetryPromise, timeoutPromise]);
  } catch (error) {
    console.error("Unexpected error in getLiveTelemetry:", error);
    return DEFAULT_TELEMETRY;
  }
}

export async function getLatestLogs(limit = 5) {
  try {
    const client = await clientPromise;
    return await client
      .db(DB_NAME)
      .collection(LOGS_COLL)
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
  } catch (error) {
    console.error('getLatestLogs error:', error);
    return [];
  }
}

export async function logFanQuery(text: string) {
  try {
    const client = await clientPromise;

    client
      .db(DB_NAME)
      .collection(LOGS_COLL)
      .insertOne({
        text,
        timestamp: new Date(),
      })
      .catch((err) => console.error('logFanQuery background error:', err));
  } catch (error) {
    console.error('logFanQuery initial connection error:', error);
  }
}