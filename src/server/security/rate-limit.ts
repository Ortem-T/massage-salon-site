type RateLimitBucket = {
  timestamps: number[];
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

function pruneBucket(bucket: RateLimitBucket, now: number, windowMs: number) {
  bucket.timestamps = bucket.timestamps.filter((timestamp) => now - timestamp < windowMs);
}

function getBucket(key: string, now: number, windowMs: number) {
  const bucket = buckets.get(key) ?? { timestamps: [] };
  pruneBucket(bucket, now, windowMs);

  if (bucket.timestamps.length === 0) {
    buckets.delete(key);
  } else {
    buckets.set(key, bucket);
  }

  return bucket;
}

export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const bucket = getBucket(key, now, windowMs);
  const oldest = bucket.timestamps[0] ?? now;

  return {
    allowed: bucket.timestamps.length < limit,
    remaining: Math.max(0, limit - bucket.timestamps.length),
    resetAt: oldest + windowMs
  };
}

export function consumeRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  const bucket = getBucket(key, now, windowMs);
  const oldest = bucket.timestamps[0] ?? now;

  if (bucket.timestamps.length >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldest + windowMs
    };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);

  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.timestamps.length),
    resetAt: bucket.timestamps[0] + windowMs
  };
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cfConnectingIp = request.headers.get("cf-connecting-ip")?.trim();

  return forwardedFor || realIp || cfConnectingIp || "unknown";
}

