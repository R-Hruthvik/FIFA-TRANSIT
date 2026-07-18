import { clientPromise } from "./db";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";
const DIAGNOSTICS_COLL = "system_error_diagnostics";

export async function logDiagnosticError(
  component: string,
  error: unknown,
  context: Record<string, unknown> = {},
) {
  try {
    const mongoClient = await clientPromise;
    const db = mongoClient.db(DB_NAME);

    const errorPayload = {
      timestamp: new Date(),
      component,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : null,
      environmentFlags: {
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
        hasNvidiaKey: !!process.env.NVIDIA_NIM_API_KEY,
        nodeEnv: process.env.NODE_ENV,
      },
      ...context,
    };

    // Output to stdout for development visibility
    console.error(`[DIAGNOSTIC ERROR][${component}]:`, errorPayload);

    // Background execution to prevent blockages
    db.collection(DIAGNOSTICS_COLL)
      .insertOne(errorPayload)
      .catch((e) => {
        console.error(
          "Critical failure inside diagnostic database logging engine:",
          e,
        );
      });
  } catch (logSystemError) {
    console.error(
      "Failed to initialize diagnostics connection handler:",
      logSystemError,
    );
  }
}
