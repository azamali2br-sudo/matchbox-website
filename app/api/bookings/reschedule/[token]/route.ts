import { NextRequest, NextResponse } from 'next/server'
import { addHoursToTime, getTotalPrice, formatDate, formatTime } from '@/lib/constants'
import { CREDIT_EXPIRY_DAYS, hoursUntilSlot } from '@/lib/credits'
import { releaseLapsedHolds } from '@/lib/holds'
import { onlineSlotRuleError, slotHasClash, slotShapeError, slotStartMs } from '@/lib/booking-slot'
import { rateLimit } from '@/lib/rate-limit'

const TOKEN_RE = /^[a-f0-9]{32,64}$/

// Paid (cash or credit) bookings can be moved up to this many hours before the
// current slot — the same window that gets a 100% cancellation credit, so moving
// can't be used to dodge the late-cancel tiers. Unpaid bookings can be moved any
// time before the slot starts (nothing is at stake, and the payment deadline
// does not move).
const RESCHEDULE_PAID_MIN_HOURS = 24

// Customer moves their own booking (court / date / time / duration). Auth: the
// booking's secret cancel_token (same as the manage page). Ref and token stay the
// same, so the original email's links keep working.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const limited = rateLimit(request, 'booking-reschedule', 20, 60 * 60 * 1000)
  if (limited) return limited

  const { token } = await params
  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

  const body = await request.json().catch(() => null)
  const next = {
    court: String(body?.court ?? ''),
    date: String(body?.date ?? ''),
    startTime: String(body?.startTime ?? ''),
    durationHours: Number(body?.durationHours),
  }
  const shapeErr = slotShapeError(next)
  if (shapeErr) return NextResponse.json({ error: shapeErr }, { status: 400 })
  const ruleErr = onlineSlotRuleError(next)
  if (ruleErr) return NextResponse.json({ error: ruleErr }, { status: 400 })

  const { supabaseAdmin } = await import('@/lib/supabase')
  await releaseLapsedHolds(supabaseAdmin)

  const { data: b, error } = await supabaseAdmin
    .from('bookings').select('*').eq('cancel_token', token).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!b) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (b.attendance !== 'booked') {
    return NextResponse.json({ error: b.attendance === 'cancelled' ? 'This booking was cancelled or its payment hold expired.' : 'This booking can no longer be changed.' }, { status: 400 })
  }

  const hoursLeft = hoursUntilSlot(b.date, b.start_time)
  if (hoursLeft <= 0) return NextResponse.json({ error: 'This slot has already started. WhatsApp us for help.' }, { status: 400 })

  const paid = Number(b.paid_amount ?? 0)
  const creditApplied = Number(b.credit_applied ?? 0)
  const valueIn = paid + creditApplied
  if (valueIn > 0 && hoursLeft < RESCHEDULE_PAID_MIN_HOURS) {
    return NextResponse.json({ error: `Paid bookings can be changed up to ${RESCHEDULE_PAID_MIN_HOURS} hours before the slot. WhatsApp us and we'll help.` }, { status: 400 })
  }

  if (b.court === next.court && b.date === next.date && b.start_time === next.startTime && Number(b.duration_hours) === next.durationHours) {
    return NextResponse.json({ error: 'That is already your booking.' }, { status: 400 })
  }

  try {
    if (await slotHasClash(supabaseAdmin, next, b.id)) {
      return NextResponse.json({ error: 'That slot is taken. Please pick another time.' }, { status: 409 })
    }
  } catch (err) {
    console.error('[reschedule] overlap lookup failed:', err)
    return NextResponse.json({ error: 'Could not check availability. Please try again.' }, { status: 500 })
  }

  // ── New price ────────────────────────────────────────────────────
  const courtTotal = getTotalPrice(next.startTime, next.durationHours)
  const newGrandTotal = courtTotal + Number(b.extras_total ?? 0)
  // Cheaper slot than what's already been put in: hand back the difference as
  // credit, but only out of credit that was applied (credit in → credit out).
  // Cash overpayments are settled in person, so those moves go to WhatsApp.
  let newCreditApplied = creditApplied
  let creditReturned = 0
  if (valueIn > newGrandTotal) {
    const excess = valueIn - newGrandTotal
    if (excess > creditApplied) {
      return NextResponse.json({ error: 'The new slot costs less than you have already paid. WhatsApp us and we\'ll move it and sort the difference.' }, { status: 400 })
    }
    creditReturned = excess
    newCreditApplied = creditApplied - excess
  }

  // Payment deadline never moves later (no free extensions by rescheduling), but
  // it can't run past the new slot's start either.
  let holdExpiresAt: string | null = b.hold_expires_at
  if (holdExpiresAt) {
    holdExpiresAt = new Date(Math.min(new Date(holdExpiresAt).getTime(), slotStartMs(next.date, next.startTime))).toISOString()
  }

  const previousLabel = `Box ${b.court}, ${formatDate(b.date)}, ${formatTime(b.start_time)}–${formatTime(b.end_time)} (${b.duration_hours}h)`
  const stamp = new Date().toLocaleString('en-GB', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  const note = `Moved by customer on ${stamp} — was ${previousLabel}`
  const adminNote = b.admin_note ? `${b.admin_note}\n${note}` : note

  const { data: updated, error: upErr } = await supabaseAdmin
    .from('bookings')
    .update({
      court: next.court,
      date: next.date,
      start_time: next.startTime,
      end_time: addHoursToTime(next.startTime, next.durationHours),
      duration_hours: next.durationHours,
      court_total: courtTotal,
      credit_applied: newCreditApplied,
      hold_expires_at: holdExpiresAt,
      admin_note: adminNote,
    })
    .eq('id', b.id)
    .eq('attendance', 'booked')
    .select()
    .maybeSingle()
  if (upErr?.code === '23P01') {
    return NextResponse.json({ error: 'That slot has just been taken. Please pick another time.' }, { status: 409 })
  }
  if (upErr) {
    console.error('[reschedule] update failed:', { code: upErr.code, message: upErr.message, booking: b.ref })
    return NextResponse.json({ error: `Could not change the booking (${upErr.code ?? 'db'}). Please try again.` }, { status: 500 })
  }
  if (!updated) return NextResponse.json({ error: 'This booking can no longer be changed.' }, { status: 409 })

  if (creditReturned > 0) {
    const { error: cErr } = await supabaseAdmin.from('credits').insert({
      phone: b.phone,
      amount: creditReturned,
      source: 'manual_adjust',
      booking_id: b.id,
      expires_at: new Date(Date.now() + CREDIT_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString(),
      note: 'Booking moved to a cheaper slot — difference returned',
    })
    if (cErr) console.error('[reschedule] credit return failed — add by hand:', { cErr, booking: b.ref, amount: creditReturned })
  }

  const amountOwed = Math.max(0, Number(updated.grand_total) - paid - newCreditApplied)

  if (b.email) {
    try {
      const { sendBookingRescheduled } = await import('@/lib/email')
      await sendBookingRescheduled({
        ref: updated.ref, court: updated.court, date: updated.date,
        startTime: updated.start_time, endTime: updated.end_time,
        durationHours: Number(updated.duration_hours), name: updated.name, email: b.email,
        totalPrice: Number(updated.grand_total), cancelToken: updated.cancel_token,
        holdExpiresAt: updated.hold_expires_at ?? undefined,
        amountOwed, previousLabel, extraCredit: creditReturned,
      })
    } catch (err) {
      console.error('[email] reschedule send failed:', err)
    }
  }

  return NextResponse.json({ ok: true, amountOwed, creditReturned, grandTotal: updated.grand_total })
}
