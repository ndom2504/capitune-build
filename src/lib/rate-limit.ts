import { GENERATION_RATE_LIMIT } from "@/lib/constants";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function consumeRateLimit(key: string): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + GENERATION_RATE_LIMIT.windowMs });
    return { ok: true };
  }
  if (current.count >= GENERATION_RATE_LIMIT.max) {
    return { ok: false, retryAfterMs: current.resetAt - now };
  }
  current.count += 1;
  return { ok: true };
}

export function resetRateLimitForTests(): void {
  buckets.clear();
}
