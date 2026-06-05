export interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const now = options.now ?? Date.now();
  const existing = buckets.get(options.key);
  const bucket = !existing || existing.resetAt <= now
    ? { count: 0, resetAt: now + options.windowMs }
    : existing;

  bucket.count += 1;
  buckets.set(options.key, bucket);

  const allowed = bucket.count <= options.limit;
  return {
    allowed,
    limit: options.limit,
    remaining: Math.max(0, options.limit - bucket.count),
    resetAt: new Date(bucket.resetAt),
  };
}

export function resetRateLimitBucket(key?: string) {
  if (key) {
    buckets.delete(key);
    return;
  }
  buckets.clear();
}
