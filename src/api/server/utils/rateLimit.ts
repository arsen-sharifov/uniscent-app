import type { IRateLimitBucket, IRateLimitOptions } from '@interfaces';
import { RATE_LIMIT_MAX_TRACKED_KEYS } from '@constants';

export const createRateLimiter = ({ maxAttempts, windowMs }: IRateLimitOptions) => {
  const buckets = new Map<string, IRateLimitBucket>();

  return (key: string): boolean => {
    const now = Date.now();
    buckets.forEach((bucket, bucketKey) => {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    });

    const bucket = buckets.get(key);

    if (!bucket) {
      if (buckets.size >= RATE_LIMIT_MAX_TRACKED_KEYS) buckets.delete(buckets.keys().next().value ?? '');
      buckets.set(key, { count: 1, resetAt: now + windowMs });

      return true;
    }

    if (bucket.count >= maxAttempts) return false;

    bucket.count += 1;

    return true;
  };
};
