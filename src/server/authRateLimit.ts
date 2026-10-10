import crypto from 'node:crypto';

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

/** Process-local IP limiting complements the persistent per-account cooldown. */
export function allowAuthAttempt(
  scope: string,
  identity: string,
  limit: number,
  windowMs: number,
  now = Date.now()
) {
  const key = crypto.createHash('sha256').update(`${scope}\0${identity}`).digest('hex');
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;

  if (buckets.size > 10_000) {
    for (const [candidate, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(candidate);
    }
  }
  return true;
}

export function resetAuthRateLimitsForTests() {
  buckets.clear();
}
