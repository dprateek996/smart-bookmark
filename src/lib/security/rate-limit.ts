import { HttpError } from '@/lib/errors/http-error'

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
let callsSinceCleanup = 0

type RateLimitOptions = {
  limit: number
  windowMs: number
}

function resolveClientIp(request: Request): string {
  const forwardedFor =
    request.headers.get('x-forwarded-for') ??
    request.headers.get('x-vercel-forwarded-for') ??
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-real-ip')

  if (!forwardedFor) {
    return 'unknown'
  }

  return forwardedFor.split(',')[0].trim()
}

function cleanupExpiredBuckets(now: number) {
  if (callsSinceCleanup < 100) {
    return
  }

  callsSinceCleanup = 0

  for (const [key, bucket] of buckets.entries()) {
    if (now >= bucket.resetAt) {
      buckets.delete(key)
    }
  }
}

export function enforceRateLimit(
  request: Request,
  namespace: string,
  options: RateLimitOptions
) {
  const ip = resolveClientIp(request)
  const key = `${namespace}:${ip}`
  const now = Date.now()
  callsSinceCleanup += 1
  cleanupExpiredBuckets(now)

  const bucket = buckets.get(key)

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, {
      count: 1,
      resetAt: now + options.windowMs
    })
    return
  }

  bucket.count += 1

  if (bucket.count > options.limit) {
    throw new HttpError(
      429,
      'RATE_LIMIT_EXCEEDED',
      'Too many requests, please try again later'
    )
  }
}
