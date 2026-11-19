import { NextRequest, NextResponse } from 'next/server'
import {
  ACCOUNT_COOKIE,
  accountCookieOptions,
  createAccountSession,
  getCurrentAccountSession,
  shouldRefreshSession,
} from '@/lib/account-auth'
import { getAccountById, getAccountDashboard } from '@/lib/accounts'

// The logged-in player's everything: profile, credit, Match IQ, booking history.
// `?optional=1` = "just tell me if someone is logged in": a logged-out visitor
// gets 200 { account: null } instead of a 401, so the browser console stays
// clean on every page (the navbar probes this on each navigation). Callers that
// must bounce to /login (the account page) omit it and keep the 401.
export async function GET(request: NextRequest) {
  const optional = new URL(request.url).searchParams.get('optional') === '1'
  const session = await getCurrentAccountSession()
  if (!session) return NextResponse.json({ account: null }, { status: optional ? 200 : 401 })

  const { supabaseAdmin } = await import('@/lib/supabase')
  const account = await getAccountById(supabaseAdmin, session.accountId)
  if (!account) return NextResponse.json({ account: null }, { status: optional ? 200 : 401 })

  const dashboard = await getAccountDashboard(supabaseAdmin, account)
  const res = NextResponse.json(dashboard)
  // Sliding session: renew the cookie for anyone active before it can expire,
  // so only truly lapsed players ever see the magic-link login again.
  if (shouldRefreshSession(session.exp)) {
    res.cookies.set(ACCOUNT_COOKIE, createAccountSession(account.id), accountCookieOptions())
  }
  return res
}
