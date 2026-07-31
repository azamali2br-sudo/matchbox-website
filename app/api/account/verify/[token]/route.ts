import { NextRequest, NextResponse } from 'next/server'
import { consumeMagicToken } from '@/lib/accounts'
import { createAccountSession, accountCookieOptions, ACCOUNT_COOKIE } from '@/lib/account-auth'

const TOKEN_RE = /^[a-f0-9]{64}$/

// The magic link lands here. Consume the token, set the session cookie, and
// redirect into the account. Single-use — a consumed/expired link bounces to login.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const base = new URL(request.url).origin

  if (!TOKEN_RE.test(token)) {
    return NextResponse.redirect(`${base}/login?error=invalid`)
  }

  const { supabaseAdmin } = await import('@/lib/supabase')
  let account
  try {
    account = await consumeMagicToken(supabaseAdmin, token)
  } catch {
    return NextResponse.redirect(`${base}/login?error=server`)
  }
  if (!account) {
    return NextResponse.redirect(`${base}/login?error=expired`)
  }

  // Land wherever the login started (e.g. the match-submit form) — relative
  // paths only, so the link can never redirect off-site.
  const nextParam = new URL(request.url).searchParams.get('next')
  const next = nextParam && /^\/(?!\/)[\w\-/?=&%.]*$/.test(nextParam) ? nextParam : '/account'

  const res = NextResponse.redirect(`${base}${next}`)
  res.cookies.set(ACCOUNT_COOKIE, createAccountSession(account.id), accountCookieOptions())
  return res
}
