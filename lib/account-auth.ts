// Customer account sessions. Same HMAC-signed-cookie pattern as admin-auth.ts,
// but the payload carries the account id and the session is long-lived — this is
// a closed, repeat community, so a player logs in once on their phone and stays
// logged in. No passwords anywhere; the magic link is the only way in.

import { createHmac, timingSafeEqual, randomBytes } from 'crypto'
import { cookies } from 'next/headers'

export const ACCOUNT_COOKIE = 'mbx_account_session'
const SESSION_TTL_DAYS = 60
// Sliding session: once less than this much lifetime remains, the next
// authenticated request mints a fresh cookie. Anyone active at least once per
// TTL window therefore never gets logged out; only truly lapsed sessions expire
// and need a new magic link.
const REFRESH_BELOW_MS = (SESSION_TTL_DAYS / 2) * 24 * 60 * 60 * 1000

function getSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET is missing or too short.')
  }
  return secret
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url')
}

export function createAccountSession(accountId: string): string {
  const exp = Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000
  const nonce = randomBytes(8).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ sub: accountId, exp, nonce })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

// Returns the account id + expiry if the session is valid, else null.
export function readAccountSessionFull(token: string | undefined): { accountId: string; exp: number } | null {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  const expected = sign(payload)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const { sub, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString())
    if (typeof exp !== 'number' || exp <= Date.now()) return null
    return typeof sub === 'string' ? { accountId: sub, exp } : null
  } catch {
    return null
  }
}

// Returns the account id if the session is valid, else null.
export function readAccountSession(token: string | undefined): string | null {
  return readAccountSessionFull(token)?.accountId ?? null
}

// True once a valid session is close enough to expiry to deserve a fresh cookie.
export function shouldRefreshSession(exp: number): boolean {
  return exp - Date.now() < REFRESH_BELOW_MS
}

// Read the current logged-in account id from the request cookies (or null).
export async function getCurrentAccountId(): Promise<string | null> {
  const store = await cookies()
  return readAccountSession(store.get(ACCOUNT_COOKIE)?.value)
}

// Same, but with the expiry — for endpoints that slide the session forward.
export async function getCurrentAccountSession(): Promise<{ accountId: string; exp: number } | null> {
  const store = await cookies()
  return readAccountSessionFull(store.get(ACCOUNT_COOKIE)?.value)
}

export function accountCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,   // lax so the magic-link click (top-level GET) carries the cookie
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  }
}

// Magic-link token: opaque random string stored in account_login_tokens.
export function newMagicToken(): string {
  return randomBytes(32).toString('hex')
}

export const MAGIC_TOKEN_TTL_MINUTES = 30
