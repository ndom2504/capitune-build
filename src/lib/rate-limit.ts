import { GENERATION_RATE_LIMIT } from "@/lib/constants";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export class RateLimitError extends Error {
  retryAfterMs: number;

  constructor(retryAfterMs: number) {
    const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
    super(`Trop de générations. Réessayez dans ${minutes} min.`);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export type QuotaTick = { ownerId: string; count: number; resetAt: number };

export function tickQuota(
  current: QuotaTick | undefined,
  ownerId: string,
  now = Date.now(),
  max = GENERATION_RATE_LIMIT.max,
  windowMs = GENERATION_RATE_LIMIT.windowMs,
): { next: QuotaTick; ok: true } | { next: QuotaTick; ok: false; retryAfterMs: number } {
  if (!current || current.resetAt <= now) {
    const next = { ownerId, count: 1, resetAt: now + windowMs };
    return { next, ok: true };
  }
  if (current.count >= max) {
    return { next: current, ok: false, retryAfterMs: Math.max(0, current.resetAt - now) };
  }
  return { next: { ...current, count: current.count + 1 }, ok: true };
}

export function consumeMemoryRateLimit(key: string): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  const current = buckets.get(key);
  const ticked = tickQuota(
    current ? { ownerId: key, count: current.count, resetAt: current.resetAt } : undefined,
    key,
    now,
  );
  buckets.set(key, { count: ticked.next.count, resetAt: ticked.next.resetAt });
  if (!ticked.ok) return { ok: false, retryAfterMs: ticked.retryAfterMs };
  return { ok: true };
}

export function resetRateLimitForTests(): void {
  buckets.clear();
}
