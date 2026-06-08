import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { findAccountByEmail, issueMagicToken } from '@/lib/accounts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Request a login link by email. Always returns ok (no account enumeration) —
// only actually sends if a verified-able account exists for that email.
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'account-login', 5, 15 * 60 * 1000)
  if (limited) return limited

  const body = await request.json().catch(() => null)
  const email = body?.email
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 })
  }

  const { supabaseAdmin } = await import('@/lib/supabase')
  const account = await findAccountByEmail(supabaseAdmin, email)

  if (account) {
    const token = await issueMagicToken(supabaseAdmin, { accountId: account.id, email, purpose: 'login' })
    const base = new URL(request.url).origin
    const link = `${base}/api/account/verify/${token}`
    const { sendMagicLink } = await import('@/lib/email')
    await sendMagicLink({ to: email, name: account.name, link, isSignup: false })
  }

  // Same response whether or not the account exists.
  return NextResponse.json({ ok: true })
}
