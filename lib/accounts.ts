// Account data layer — all server-side, service-role. Phone is the identity key;
// everything else (Match IQ rating, credit balance, booking history) is joined
// off the account's phone, so a pre-seeded account and a freshly-created one are
// structurally identical — the only difference is verified_at.

import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizePhone } from './phone'
import { newMagicToken, MAGIC_TOKEN_TTL_MINUTES } from './account-auth'
import { getCreditBalance } from './credits'

export interface Account {
  id: string
  phone: string
  email: string | null
  name: string
  verified_at: string | null
  created_at: string
}

export async function findAccountByPhone(db: SupabaseClient, phone: string): Promise<Account | null> {
  const { data, error } = await db.from('accounts').select('*').eq('phone', normalizePhone(phone)).maybeSingle()
  if (error) throw error
  return data as Account | null
}

export async function findAccountByEmail(db: SupabaseClient, email: string): Promise<Account | null> {
  const { data, error } = await db.from('accounts').select('*').ilike('email', email.trim()).maybeSingle()
  if (error) throw error
  return data as Account | null
}

export async function getAccountById(db: SupabaseClient, id: string): Promise<Account | null> {
  const { data, error } = await db.from('accounts').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data as Account | null
}

// Sign-up / claim. Phone is the key:
//  - phone already has an account (e.g. a pre-seeded player) → claim it:
//    attach the email if missing, refresh the name. Stays unverified until the
//    magic link is clicked.
//  - new phone → create a fresh account.
// Returns { account, claimed } where claimed=true means they took over a pre-seeded row.
export async function createOrClaimAccount(
  db: SupabaseClient,
  args: { name: string; phone: string; email: string },
): Promise<{ account: Account; claimed: boolean }> {
  const phone = normalizePhone(args.phone)
  const email = args.email.trim()
  const name = args.name.trim()

  const existing = await findAccountByPhone(db, phone)
  if (existing) {
    const updates: Record<string, unknown> = {}
    if (!existing.email) updates.email = email
    if (!existing.name && name) updates.name = name
    if (Object.keys(updates).length > 0) {
      const { data, error } = await db.from('accounts').update(updates).eq('id', existing.id).select().single()
      if (error) throw error
      return { account: data as Account, claimed: true }
    }
    return { account: existing, claimed: true }
  }

  const { data, error } = await db
    .from('accounts')
    .insert({ phone, email, name })
    .select()
    .single()
  if (error) throw error
  return { account: data as Account, claimed: false }
}

// Issue a single-use magic link token for an account + email.
export async function issueMagicToken(
  db: SupabaseClient,
  args: { accountId: string; email: string; purpose: 'login' | 'signup' | 'claim' },
): Promise<string> {
  const token = newMagicToken()
  const expires_at = new Date(Date.now() + MAGIC_TOKEN_TTL_MINUTES * 60 * 1000).toISOString()
  const { error } = await db.from('account_login_tokens').insert({
    token, account_id: args.accountId, email: args.email.trim(), purpose: args.purpose, expires_at,
  })
  if (error) throw error
  return token
}

// Consume a magic link: validate (exists, unused, unexpired), mark used, verify
// the account (set verified_at, and attach the email if it was still blank).
// Returns the account on success, or null if the token is bad/used/expired.
export async function consumeMagicToken(db: SupabaseClient, token: string): Promise<Account | null> {
  const { data: row, error } = await db
    .from('account_login_tokens')
    .select('*')
    .eq('token', token)
    .maybeSingle()
  if (error) throw error
  if (!row) return null
  if (row.used_at) return null
  if (new Date(row.expires_at).getTime() <= Date.now()) return null

  // Mark token used (guard against double-use race).
  const { data: claimed, error: useErr } = await db
    .from('account_login_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id)
    .is('used_at', null)
    .select()
    .maybeSingle()
  if (useErr) throw useErr
  if (!claimed) return null // someone else consumed it first

  const accountUpdates: Record<string, unknown> = { verified_at: new Date().toISOString() }
  const acct = await getAccountById(db, row.account_id)
  if (acct && !acct.email && row.email) accountUpdates.email = row.email

  const { data: updated, error: upErr } = await db
    .from('accounts')
    .update(accountUpdates)
    .eq('id', row.account_id)
    .select()
    .single()
  if (upErr) throw upErr
  return updated as Account
}

// Everything a logged-in player sees: profile, credit, Match IQ, booking history.
export async function getAccountDashboard(db: SupabaseClient, account: Account) {
  const phone = account.phone

  // Match IQ (joined by phone)
  const { data: player } = await db
    .from('players')
    .select('id, name, rating, wins, losses')
    .eq('phone', phone)
    .maybeSingle()

  // Credit balance (non-expired)
  const creditBalance = await getCreditBalance(db, phone)

  // Credit ledger (statement) — every movement, newest first.
  const { data: creditRows } = await db
    .from('credits')
    .select('amount, source, note, created_at, expires_at, booking_id, used_in_booking_id')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(100)
  const ledger = creditRows ?? []
  const totalIn = ledger.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0)
  const totalOut = ledger.filter(r => r.amount < 0).reduce((s, r) => s + Math.abs(r.amount), 0)
  // Running "balance after" per row (gross of expiry), newest→oldest.
  const grossBalance = ledger.reduce((s, r) => s + r.amount, 0)
  let running = grossBalance
  const ledgerWithBalance = ledger.map(r => {
    const balanceAfter = running
    running -= r.amount
    return { ...r, balanceAfter }
  })

  // Bookings (by phone)
  const { data: bookings } = await db
    .from('bookings')
    .select('id, ref, court, date, start_time, end_time, duration_hours, attendance, grand_total, paid_amount, credit_applied, source')
    .eq('phone', phone)
    .order('date', { ascending: false })

  return {
    account: {
      id: account.id, name: account.name, phone: account.phone,
      email: account.email, verified: !!account.verified_at,
    },
    matchIq: player
      ? {
          playerId: player.id, rating: player.rating,
          wins: player.wins, losses: player.losses,
          matches: (player.wins ?? 0) + (player.losses ?? 0),
        }
      : null,
    credit: { balance: creditBalance, totalIn, totalOut, ledger: ledgerWithBalance },
    bookings: bookings ?? [],
  }
}
