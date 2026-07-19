import { MongoClient, type MongoClientOptions } from 'mongodb';
import type { StadiumTelemetry } from '@/types/telemetry';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI environment variable is not set. Please add your MongoDB Atlas connection string to .env.local');

// Production-grade MongoDB connection options
const options: MongoClientOptions = {
  // Connection pooling for better performance
  maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE || '10', 10),
  minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '5', 10),
  
  // Timeout configuration
  serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS || '5000', 10),
  socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT_MS || '45000', 10),
  
  // Retry writes for resilience
  retryWrites: true,
  retryReads: true,
  
  // TLS/SSL is enabled by default in Atlas
  tls: true,
};

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

export const GLOBAL_SETTINGS_ID = "global" as unknown as import("mongodb").ObjectId;

export type { StadiumTelemetry, StadiumTelemetry as StadiumState } from '@/types/telemetry';

export async function getUserCollection() {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  return db.collection(USERS_COLL);
}

export async function getLiveTelemetry(): Promise<StadiumTelemetry | null> {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const data = await db.collection(TELEMETRY_COLL).findOne({}, { sort: { _id: -1 } });
    if (!data) return null;
    return data as unknown as StadiumTelemetry;
  } catch {
    return null;
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
  } catch {
    return [];
  }
}

export async function logFanQuery(text: string) {
  try {
    const client = await clientPromise;
    client
      .db(DB_NAME)
      .collection(LOGS_COLL)
      .insertOne({ text, timestamp: new Date() })
      .catch(() => {});
  } catch {}
}
