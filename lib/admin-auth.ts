import { createHmac, timingSafeEqual, randomBytes } from 'crypto'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const ADMIN_COOKIE = 'mbx_admin_session'
const SESSION_TTL_HOURS = 12

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error(
      'SESSION_SECRET is missing or too short. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"'
    )
  }
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function createSessionToken(): string {
  const exp = Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000
  const nonce = randomBytes(8).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ exp, nonce })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return false

  const expected = sign(payload)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false

  try {
    const { exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return typeof exp === 'number' && exp > Date.now()
  } catch {
    return false
  }
}

/**
 * Guard for admin-only route handlers.
 * Returns null if the caller is authenticated, or a 401 NextResponse if not.
 *
 * Usage:
 *   const guard = await requireAdmin(request)
 *   if (guard) return guard
 */
export async function requireAdmin(_request: NextRequest): Promise<NextResponse | null> {
  const store = await cookies()
  const token = store.get(ADMIN_COOKIE)?.value
  if (!verifySessionToken(token)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_HOURS * 60 * 60,
  }
}
