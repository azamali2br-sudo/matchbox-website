// Credit ledger helpers — phone-keyed, supports negative rows for reversals/spends.
// All callers should be admin routes (service role) or token-authenticated.

import type { SupabaseClient } from '@supabase/supabase-js'

export const PREPAY_REWARD_RATE = 0.15           // 15% of paid_amount as credit on full prepay
export const CREDIT_EXPIRY_DAYS = 90              // Standard 3-month loyalty window
export const NO_SHOW_FLAG_THRESHOLD = 3           // ≥ this many no-shows in 6 months → flagged

// Cancellation tiers (hours before slot → % credit of paid_amount)
export function cancellationTierPercent(hoursBeforeSlot: number): number {
  if (hoursBeforeSlot >= 24) return 1.0
  if (hoursBeforeSlot >= 2) return 0.5
  return 0
}

export function tierLabel(hoursBeforeSlot: number): string {
  if (hoursBeforeSlot >= 24) return '24+ hours'
  if (hoursBeforeSlot >= 2) return '2–24 hours'
  return '< 2 hours'
}

// Sum non-expired credits for a phone. Treats expired rows as gone (not subtracted
// — they just no longer count). Negative rows are part of the balance.
export async function getCreditBalance(db: SupabaseClient, phone: string): Promise<number> {
  const nowIso = new Date().toISOString()
  const { data, error } = await db
    .from('credits')
    .select('amount, expires_at')
    .eq('phone', phone)
  if (error) throw error
  return (data ?? [])
    .filter(r => !r.expires_at || r.expires_at > nowIso)
    .reduce((sum, r) => sum + (r.amount as number), 0)
}

function expiryDate(days = CREDIT_EXPIRY_DAYS): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
}

// Issue 15% prepay reward credit. Idempotent-ish: caller decides when to invoke
// (typically on pending → confirmed transition when paid_amount ≥ grand_total).
export async function issuePrepayReward(
  db: SupabaseClient,
  args: { bookingId: string; phone: string; paidAmount: number },
): Promise<{ amount: number }> {
  const amount = Math.round(args.paidAmount * PREPAY_REWARD_RATE)
  if (amount <= 0) return { amount: 0 }
  const { error } = await db.from('credits').insert({
    phone: args.phone,
    amount,
    source: 'prepay_reward',
    booking_id: args.bookingId,
    expires_at: expiryDate(),
    note: `15% prepay reward on ${args.paidAmount}`,
  })
  if (error) throw error
  return { amount }
}

// On cancellation: reverse the original prepay_reward AND issue a tiered
// cancel_refund credit. Refund basis is paid_amount + credit_applied (total
// value the customer put into the booking). Returns the net credit change.
export async function applyCancellationCredits(
  db: SupabaseClient,
  args: { bookingId: string; phone: string; paidAmount: number; creditApplied: number; hoursBeforeSlot: number },
): Promise<{ refundCredit: number; reversedReward: number; net: number }> {
  const { data: priorReward, error: fErr } = await db
    .from('credits')
    .select('amount')
    .eq('booking_id', args.bookingId)
    .eq('source', 'prepay_reward')
  if (fErr) throw fErr
  const rewardAmount = (priorReward ?? []).reduce((s, r) => s + (r.amount as number), 0)

  if (rewardAmount > 0) {
    const { error: rErr } = await db.from('credits').insert({
      phone: args.phone,
      amount: -rewardAmount,
      source: 'prepay_reward',
      booking_id: args.bookingId,
      note: 'Reversal — booking cancelled',
    })
    if (rErr) throw rErr
  }

  const valueIn = args.paidAmount + args.creditApplied
  const tier = cancellationTierPercent(args.hoursBeforeSlot)
  const refundCredit = Math.round(valueIn * tier)
  if (refundCredit > 0) {
    const { error: cErr } = await db.from('credits').insert({
      phone: args.phone,
      amount: refundCredit,
      source: 'cancel_refund',
      booking_id: args.bookingId,
      expires_at: expiryDate(),
      note: `${Math.round(tier * 100)}% cancel credit on ${valueIn} (${args.hoursBeforeSlot.toFixed(1)}h before slot)`,
    })
    if (cErr) throw cErr
  }

  return { refundCredit, reversedReward: rewardAmount, net: refundCredit - rewardAmount }
}

// Spend credit on a booking. Writes a negative ledger row and adds the amount
// to booking.credit_applied (supports incremental top-ups). Caller is responsible
// for upstream validation (balance, max applicable to this booking).
export async function redeemCredit(
  db: SupabaseClient,
  args: { phone: string; bookingId: string; amount: number; currentCreditApplied: number },
): Promise<{ newCreditApplied: number }> {
  if (args.amount <= 0) return { newCreditApplied: args.currentCreditApplied }
  const { error: insErr } = await db.from('credits').insert({
    phone: args.phone,
    amount: -args.amount,
    source: 'redemption',
    used_in_booking_id: args.bookingId,
    note: 'Redeemed on booking',
  })
  if (insErr) throw insErr
  const newCreditApplied = args.currentCreditApplied + args.amount
  const { error: upErr } = await db
    .from('bookings')
    .update({ credit_applied: newCreditApplied })
    .eq('id', args.bookingId)
  if (upErr) throw upErr
  return { newCreditApplied }
}

// Compute hours between now and slot start in Asia/Karachi.
export function hoursUntilSlot(date: string, startTime: string): number {
  const slotMs = new Date(`${date}T${startTime}:00+05:00`).getTime()
  return (slotMs - Date.now()) / (60 * 60 * 1000)
}
