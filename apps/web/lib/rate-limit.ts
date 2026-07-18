/** Sliding-window rate limiter (in-memory, per serverless instance). */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const DEFAULT_WINDOW_MS = 60_000;

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs = DEFAULT_WINDOW_MS,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export function loginRateLimitConfig() {
  const limit = Number(process.env.LOGIN_RATE_LIMIT_MAX || "5");
  const windowSec = Number(process.env.LOGIN_RATE_LIMIT_WINDOW_SEC || "60");
  return { limit, windowMs: windowSec * 1000 };
}
