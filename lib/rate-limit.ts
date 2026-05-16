import { NextRequest, NextResponse } from 'next/server'

/**
 * Tiny in-memory rate limiter, keyed by IP.
 *
 * Caveat: state is per-process. On Vercel a cold start = fresh memory, and
 * multiple concurrent instances each have their own counter. For low-traffic
 * sites this still defeats trivial scripted abuse (the common case). For
 * stronger guarantees, swap to Upstash Ratelimit or a Supabase-backed counter.
 */
type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()

function getIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return req.headers.get('x-real-ip') ?? 'unknown'
}

/**
 * Returns null if the caller is under the limit, or a 429 NextResponse if not.
 * @param windowMs sliding-ish window length
 * @param max     allowed hits per window
 * @param scope   namespace so different endpoints don't share counters
 */
export function rateLimit(
  req: NextRequest,
  scope: string,
  max: number,
  windowMs: number,
): NextResponse | null {
  const key = `${scope}:${getIp(req)}`
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return null
  }

  if (existing.count >= max) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000)
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  existing.count++
  return null
}

// Opportunistic cleanup so the Map can't grow forever
setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key)
  }
}, 5 * 60 * 1000).unref?.()
