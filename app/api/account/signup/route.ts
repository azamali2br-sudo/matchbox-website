import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { isValidPkMobile } from '@/lib/phone'
import { createOrClaimAccount, issueMagicToken } from '@/lib/accounts'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Sign up OR claim. Works for brand-new players and for pre-seeded players
// claiming their profile — createOrClaimAccount keys on the (normalized) phone.
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'account-signup', 5, 15 * 60 * 1000)
  if (limited) return limited

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const { name, phone, email } = body

  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
    return NextResponse.json({ error: 'Please enter your name' }, { status: 400 })
  }
  if (typeof phone !== 'string' || !isValidPkMobile(phone)) {
    return NextResponse.json({ error: 'Please enter a valid Pakistani mobile number' }, { status: 400 })
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email' }, { status: 400 })
  }

  const { supabaseAdmin } = await import('@/lib/supabase')
  const { account, claimed } = await createOrClaimAccount(supabaseAdmin, { name, phone, email })

  const token = await issueMagicToken(supabaseAdmin, {
    accountId: account.id,
    email: account.email || email,
    purpose: claimed ? 'claim' : 'signup',
  })

  const base = new URL(request.url).origin
  const link = `${base}/api/account/verify/${token}`
  const { sendMagicLink } = await import('@/lib/email')
  await sendMagicLink({ to: account.email || email, name: account.name, link, isSignup: true })

  return NextResponse.json({ ok: true, claimed, email: account.email || email })
}
