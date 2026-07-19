/**
 * Shared NVIDIA NIM rate limiter.
 *
 * Hard budget: 20 requests per minute (the NVIDIA NIM free-tier ceiling).
 * Implemented as a single in-memory token bucket so every autonomous path
 * (staff insights, egress plan, fan narrative, maps agent) draws from the
 * same pool — preventing any single feature from burning the whole budget.
 *
 * Non-blocking: acquire() returns false immediately when no token is left,
 * letting callers fall back to deterministic templates instead of 429-ing.
 *
 * IMPORTANT: In Next.js serverless, each API route invocation gets a fresh
 * module scope. We store the singleton on `globalThis` so the same bucket
 * persists across requests within a single server process.
 */

const CAPACITY = 20;
const REFILL_PER_MINUTE = 20;
const REFILL_INTERVAL_MS = 60_000 / REFILL_PER_MINUTE; // 3s per token

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed <= 0) return;
    const added = Math.floor(elapsed / REFILL_INTERVAL_MS);
    if (added > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + added);
      this.lastRefill += added * REFILL_INTERVAL_MS;
    }
  }

  /** Returns true if a token was available and consumed. */
  acquire(): boolean {
    this.refill();
    if (this.tokens <= 0) return false;
    this.tokens -= 1;
    return true;
  }

  /** Tokens currently available (for diagnostics/headers). */
  available(): number {
    this.refill();
    return this.tokens;
  }
}

// Attach to globalThis so the singleton survives across serverless invocations
// within the same Node.js process. Without this, every API route gets a fresh
// RateLimiter with 20 tokens, defeating the purpose entirely.
const globalKey = "__nimRateLimiter__" as const;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = globalThis;
export const nimRateLimiter: RateLimiter = g[globalKey] ?? (g[globalKey] = new RateLimiter(CAPACITY));
