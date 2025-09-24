import { logger } from "@/lib/logger";

// Pluggable rate limiter abstraction. In-memory bucket implementation by default.
// You can later add a Redis/Upstash backend by implementing the RateLimiterStore interface.

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms when window resets
}

export interface RateLimiterStore {
  incr(key: string, windowMs: number, max: number): Promise<RateLimitResult>;
}

class MemoryStore implements RateLimiterStore {
  private buckets = new Map<string, { count: number; windowStart: number }>();
  async incr(
    key: string,
    windowMs: number,
    max: number
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const bucket = this.buckets.get(key) || { count: 0, windowStart: now };
    if (now - bucket.windowStart >= windowMs) {
      bucket.count = 0;
      bucket.windowStart = now;
    }
    bucket.count += 1;
    this.buckets.set(key, bucket);
    const allowed = bucket.count <= max;
    return {
      allowed,
      remaining: Math.max(0, max - bucket.count),
      resetAt: bucket.windowStart + windowMs,
    };
  }
  reset() {
    this.buckets.clear();
  }
}

let _store: RateLimiterStore = new MemoryStore();

export function useRateLimiterStore(store: RateLimiterStore) {
  _store = store;
  logger.info("rate_limiter_store_set", { impl: store.constructor.name });
}

export async function rateLimit(params: {
  key: string;
  windowMs: number;
  max: number;
}): Promise<RateLimitResult> {
  return _store.incr(params.key, params.windowMs, params.max);
}

export function __resetMemoryRateLimiter() {
  if (_store instanceof MemoryStore) {
    (_store as MemoryStore).reset();
  }
}
