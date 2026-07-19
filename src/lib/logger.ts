import { clientPromise } from "./db";

const DB_NAME = process.env.MONGODB_DB || "stadium_ops";
const DIAGNOSTICS_COLL = "system_error_diagnostics";

// Log levels matching standard logging libraries
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

/**
 * Production-grade structured logger
 * - In development: outputs colored console logs
 * - In production: writes to MongoDB diagnostics and stdout (for log aggregation)
 */
export const logger = {
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, context || '');
    }
  },

  info(message: string, context?: LogContext) {
    const logEntry = formatLogEntry('info', message, context);
    if (process.env.NODE_ENV === 'development') {
      console.info(logEntry.console);
    } else {
      console.log(JSON.stringify(logEntry.json));
    }
  },

  warn(message: string, context?: LogContext) {
    const logEntry = formatLogEntry('warn', message, context);
    if (process.env.NODE_ENV === 'development') {
      console.warn(logEntry.console);
    } else {
      console.warn(JSON.stringify(logEntry.json));
    }
  },

  error(message: string, error?: unknown, context?: LogContext) {
    const logEntry = formatLogEntry('error', message, { ...context, error: serializeError(error) });
    if (process.env.NODE_ENV === 'development') {
      console.error(logEntry.console, error);
    } else {
      console.error(JSON.stringify(logEntry.json));
      // Persist critical errors to MongoDB for debugging
      persistErrorToDb(message, error, context).catch(() => {});
    }
  },
};

function formatLogEntry(level: LogLevel, message: string, context?: LogContext) {
  const timestamp = new Date().toISOString();
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  return {
    console: `[${level.toUpperCase()}] ${timestamp} - ${message}`,
    json: {
      timestamp,
      level,
      message,
      nodeEnv,
      ...context,
    },
  };
}

function serializeError(error: unknown): Record<string, unknown> {
  if (!error) return {};
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  if (typeof error === 'string') {
    return { message: error };
  }
  return { error };
}

async function persistErrorToDb(
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

    // Fire-and-forget to prevent blocking application flow
    db.collection(DIAGNOSTICS_COLL)
      .insertOne(errorPayload)
      .catch((e) => {
        console.error("Failed to persist error to diagnostics collection:", e);
      });
  } catch (logSystemError) {
    // Silent failure to prevent infinite loops
  }
}

/**
 * @deprecated Use logger.error() instead. Kept for backward compatibility.
 */
export async function logDiagnosticError(
  component: string,
  error: unknown,
  context: Record<string, unknown> = {},
) {
  logger.error(component, error, context);
}
