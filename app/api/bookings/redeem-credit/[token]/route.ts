import { NextRequest, NextResponse } from 'next/server'
import { getCreditBalance, redeemCredit } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'

const TOKEN_RE = /^[a-f0-9]{32,64}$/

// GET — returns credit balance available on the booking's phone (read-only).
// Auth: presence of valid cancel_token.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

  const { supabaseAdmin } = await import('@/lib/supabase')
  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .select('id, phone, grand_total, paid_amount, credit_applied, attendance')
    .eq('cancel_token', token)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  const balance = await getCreditBalance(supabaseAdmin, booking.phone)
  const owed = Math.max(0, booking.grand_total - booking.paid_amount - booking.credit_applied)
  const maxApplicable = Math.min(balance, owed)
  return NextResponse.json({
    balance,
    creditApplied: booking.credit_applied,
    amountOwed: owed,
    maxApplicable,
    canRedeem: booking.attendance === 'booked' && maxApplicable > 0,
  })
}

// POST — redeem N credit toward this booking. Body: { amount }.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const limited = rateLimit(request, 'credit-redeem', 10, 60 * 60 * 1000)
  if (limited) return limited

  const { token } = await params
  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

  const body = await request.json()
  const requested = Number(body.amount)
  if (!Number.isFinite(requested) || requested <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }

  const { supabaseAdmin } = await import('@/lib/supabase')
  const { data: booking, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('cancel_token', token)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.attendance !== 'booked') {
    return NextResponse.json({ error: 'Can only redeem on active bookings' }, { status: 400 })
  }

  const balance = await getCreditBalance(supabaseAdmin, booking.phone)
  const owed = Math.max(0, booking.grand_total - booking.paid_amount - booking.credit_applied)
  const maxApplicable = Math.min(balance, owed)
  if (maxApplicable <= 0) {
    return NextResponse.json({ error: 'No applicable credit available' }, { status: 400 })
  }
  const amount = Math.min(requested, maxApplicable)

  const { newCreditApplied } = await redeemCredit(supabaseAdmin, {
    phone: booking.phone,
    bookingId: booking.id,
    amount,
    currentCreditApplied: booking.credit_applied,
  })

  // If applied credit fully settles the booking, send the confirmed email.
  // (Prepay reward is NOT issued for credit-only settlement.)
  const newOwed = booking.grand_total - booking.paid_amount - newCreditApplied
  if (newOwed <= 0) {
    try {
      const { sendBookingConfirmed } = await import('@/lib/email')
      await sendBookingConfirmed({
        ref: booking.ref, court: booking.court, date: booking.date,
        startTime: booking.start_time, endTime: booking.end_time,
        durationHours: booking.duration_hours, name: booking.name,
        email: booking.email, totalPrice: booking.grand_total,
        creditEarned: 0,
        cancelToken: booking.cancel_token ?? undefined,
      })
    } catch (err) {
      console.error('[email] confirmed (credit-settle) send failed:', err)
    }
  }

  const newBalance = await getCreditBalance(supabaseAdmin, booking.phone)
  return NextResponse.json({
    applied: amount,
    creditApplied: newCreditApplied,
    amountOwed: Math.max(0, newOwed),
    newBalance,
  })
}
