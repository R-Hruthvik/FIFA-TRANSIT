import { nimRateLimiter } from "./rate-limiter";

describe("NVIDIA NIM Rate Limiter", () => {
  beforeEach(() => {
    // Reset token count and refill timestamp before each test using reflection
    (nimRateLimiter as any).tokens = 20;
    (nimRateLimiter as any).lastRefill = Date.now();
  });

  it("should initialize with full capacity", () => {
    expect(nimRateLimiter.available()).toBe(20);
  });

  it("should consume tokens upon acquisition", () => {
    const success = nimRateLimiter.acquire();
    expect(success).toBe(true);
    expect(nimRateLimiter.available()).toBe(19);
  });

  it("should block requests when capacity is exhausted", () => {
    for (let i = 0; i < 20; i++) {
      expect(nimRateLimiter.acquire()).toBe(true);
    }
    expect(nimRateLimiter.acquire()).toBe(false);
    expect(nimRateLimiter.available()).toBe(0);
  });

  it("should refill tokens over time", () => {
    for (let i = 0; i < 20; i++) {
      nimRateLimiter.acquire();
    }
    expect(nimRateLimiter.available()).toBe(0);

    // Simulate 6.1 seconds passing (6100ms) - should refill exactly 2 tokens (3s per token refill interval)
    (nimRateLimiter as any).lastRefill = Date.now() - 6100;
    
    expect(nimRateLimiter.available()).toBe(2);
    expect(nimRateLimiter.acquire()).toBe(true);
    expect(nimRateLimiter.available()).toBe(1);
  });
});
