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
  nearestGate: { label: "Gate A", status: "open" },
  nearestHub: { label: "Main Hub", waitTime: 8 },
  weatherAdvisory: { label: "Current", condition: "clear" },
};

export type { StadiumTelemetry, StadiumTelemetry as StadiumState } from '@/types/telemetry';

export async function getUserCollection() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection(USERS_COLL);
}

export async function getLiveTelemetry(): Promise<StadiumTelemetry> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const telemetry = db.collection(TELEMETRY_COLL);

    // Create a timeout promise that resolves cleanly
    const timeoutPromise = new Promise<{ isTimeout: true }>((resolve) => {
      setTimeout(() => resolve({ isTimeout: true }), 800);
    });

    // Create the DB query promise that resolves cleanly
    const telemetryPromise = telemetry.findOne({}, { sort: { _id: -1 } })
      .then(data => ({ isTimeout: false, data }))
      .catch(err => {
        console.error('Database query error:', err);
        return { isTimeout: false, data: null };
      });

    // Race them
    const result = await Promise.race([telemetryPromise, timeoutPromise]);

    if (result.isTimeout) {
      console.warn('Telemetry fetch timed out');
      return DEFAULT_TELEMETRY;
    }

    return (result.data as unknown as StadiumTelemetry) || DEFAULT_TELEMETRY;
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