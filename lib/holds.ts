// Releasing lapsed payment holds — the single implementation used by both
// GET and POST /api/bookings.
//
// An online booking gets a 30-min hold. If nothing has been paid in cash by
// then, the slot is released. Two rules keep credit safe:
//  - A booking fully settled by credit has its hold cleared at the moment the
//    credit is applied (see clearHoldIfSettled), so it never lapses.
//  - If a hold lapses on a booking that had PART of its price covered by credit,
//    that credit is returned to the customer here. (Before 2026-11-19 the slot
//    was released and the applied credit silently vanished.)

import type { SupabaseClient } from '@supabase/supabase-js'
import { CREDIT_EXPIRY_DAYS } from './credits'

type Row = Record<string, unknown>

export async function releaseLapsedHolds(db: SupabaseClient): Promise<Row[]> {
  const nowIso = new Date().toISOString()
  const { data: expired, error } = await db
    .from('bookings')
    .update({ attendance: 'cancelled', cancelled_at: nowIso, cancelled_by: 'admin' })
    .eq('attendance', 'booked')
    .eq('paid_amount', 0)
    .lt('hold_expires_at', nowIso)
    .select()
  if (error) {
    console.error('[holds] release failed:', error)
    return []
  }
  const rows = (expired ?? []) as Row[]
  if (rows.length === 0) return rows

  // Only the request whose UPDATE flipped a row gets it back, so each refund
  // below runs exactly once per booking even if two requests race.
  const expiresAt = new Date(Date.now() + CREDIT_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const refundRows = rows
    .filter(r => Number(r.credit_applied ?? 0) > 0)
    .map(r => ({
      phone: r.phone,
      amount: Number(r.credit_applied),
      source: 'cancel_refund',
      booking_id: r.id,
      expires_at: expiresAt,
      note: 'Payment hold expired — applied credit returned',
    }))
  if (refundRows.length > 0) {
    const { error: cErr } = await db.from('credits').insert(refundRows)
    if (cErr) console.error('[holds] credit return failed — add by hand:', { cErr, bookings: refundRows.map(r => r.booking_id) })
  }

  try {
    const { sendBookingExpired } = await import('./email')
    await Promise.all(rows.map(r =>
      sendBookingExpired({
        ref: r.ref as string, court: r.court as 'A' | 'B', date: r.date as string,
        startTime: r.start_time as string, endTime: r.end_time as string,
        durationHours: r.duration_hours as number, name: r.name as string,
        email: r.email as string, totalPrice: (r.grand_total as number) ?? 0,
        refundCredit: Number(r.credit_applied ?? 0),
      }).catch(err => console.error('[email] expired send failed:', err)),
    ))
  } catch (err) {
    console.error('[email] expired batch failed:', err)
  }
  return rows
}

// Call right after credit is applied to a booking. Once credit + cash cover the
// full price there's nothing left to wait for, so the hold is removed and the
// booking can never auto-release.
export async function clearHoldIfSettled(
  db: SupabaseClient,
  args: { bookingId: string; grandTotal: number; paidAmount: number; creditApplied: number },
): Promise<boolean> {
  if (args.grandTotal <= 0 || args.paidAmount + args.creditApplied < args.grandTotal) return false
  const { error } = await db.from('bookings').update({ hold_expires_at: null }).eq('id', args.bookingId)
  if (error) {
    console.error('[holds] could not clear hold on settled booking:', { bookingId: args.bookingId, error })
    return false
  }
  return true
}
