import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { isValidPkMobile, normalizePhone } from '@/lib/phone'
import { createOrClaimAccount, findAccountByEmail, issueMagicToken } from '@/lib/accounts'
import { safeNextPath } from '@/lib/next-path'

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

  // An email belongs to one account (unique lower(email)). If it's already on a
  // different number, point them to login instead of failing the insert.
  const emailOwner = await findAccountByEmail(supabaseAdmin, email)
  if (emailOwner && emailOwner.phone !== normalizePhone(phone)) {
    return NextResponse.json(
      { error: 'That email is already linked to another account. Use Log in instead.' },
      { status: 409 },
    )
  }

  const { account, claimed } = await createOrClaimAccount(supabaseAdmin, { name, phone, email })

  // Existing account with an email on file → the link only ever goes to THAT
  // email. Otherwise it goes to the address just typed, which is attached to the
  // account only when the link is clicked.
  const deliverTo = account.email || email
  const token = await issueMagicToken(supabaseAdmin, {
    accountId: account.id,
    email: deliverTo,
    purpose: claimed ? 'claim' : 'signup',
  })

  const base = new URL(request.url).origin
  // Optional return path (e.g. back to the booking slot they picked).
  const next = safeNextPath(body.next)
  const link = `${base}/api/account/verify/${token}${next ? `?next=${encodeURIComponent(next)}` : ''}`
  const { sendMagicLink } = await import('@/lib/email')
  await sendMagicLink({ to: deliverTo, name: account.name, link, isSignup: true })

  // Same response whether or not the phone was already registered, and never
  // the address on file — otherwise typing any number reveals its owner's email.
  return NextResponse.json({ ok: true })
}
