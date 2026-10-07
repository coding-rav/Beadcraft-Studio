/**
 * Minimal fixed-window in-memory rate limiter.
 *
 * NOTE: on serverless platforms each instance has its own memory, so this only
 * limits bursts per instance. For strict global limits swap the Map for a shared
 * store (e.g. Upstash Redis) behind the same function signature.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  if (now - lastSweep > 60_000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    lastSweep = now;
  }
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  b.count += 1;
  if (b.count > max) return { ok: false, retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000) };
  return { ok: true, retryAfterSeconds: 0 };
}
