import { MongoClient } from 'mongodb';

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

export { clientPromise };

export interface StadiumState {
  nearestGate: { label: string; status: string };
  nearestHub: { label: string; waitTime: number };
  weatherAdvisory: { label: string; condition: string };
}

const DEFAULT_TELEMETRY: StadiumState = {
  nearestGate: { label: "Gate A", status: "open" },
  nearestHub: { label: "Main Hub", waitTime: 8 },
  weatherAdvisory: { label: "Current", condition: "clear" }
};

export async function getLiveTelemetry(): Promise<StadiumState> {
  try {
    const client = await clientPromise;
    const db = client.db('stadium_ops');
    const telemetry = db.collection('telemetry');

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

    return (result.data as unknown as StadiumState) || DEFAULT_TELEMETRY;
  } catch (error) {
    console.error("Unexpected error in getLiveTelemetry:", error);
    return DEFAULT_TELEMETRY;
  }
}

export async function logFanQuery(text: string) {
  try {
    const client = await clientPromise;
    
    client
      .db('stadium_ops')
      .collection('query_logs')
      .insertOne({
        text,
        timestamp: new Date(),
      })
      .catch((err) => console.error('logFanQuery background error:', err));
  } catch (error) {
    console.error('logFanQuery initial connection error:', error);
  }
}
