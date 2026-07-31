import { NextResponse } from 'next/server'
import {
  ACCOUNT_COOKIE,
  accountCookieOptions,
  createAccountSession,
  getCurrentAccountSession,
  shouldRefreshSession,
} from '@/lib/account-auth'
import { getAccountById, getAccountDashboard } from '@/lib/accounts'

// The logged-in player's everything: profile, credit, Match IQ, booking history.
export async function GET() {
  const session = await getCurrentAccountSession()
  if (!session) return NextResponse.json({ account: null }, { status: 401 })

  const { supabaseAdmin } = await import('@/lib/supabase')
  const account = await getAccountById(supabaseAdmin, session.accountId)
  if (!account) return NextResponse.json({ account: null }, { status: 401 })

  const dashboard = await getAccountDashboard(supabaseAdmin, account)
  const res = NextResponse.json(dashboard)
  // Sliding session: renew the cookie for anyone active before it can expire,
  // so only truly lapsed players ever see the magic-link login again.
  if (shouldRefreshSession(session.exp)) {
    res.cookies.set(ACCOUNT_COOKIE, createAccountSession(account.id), accountCookieOptions())
  }
  return res
}
