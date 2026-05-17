import { NextRequest, NextResponse } from 'next/server'
import { applyCancellationCredits, cancellationTierPercent, tierLabel, hoursUntilSlot } from '@/lib/credits'
import { rateLimit } from '@/lib/rate-limit'

// Public — auth via opaque token in URL. One token per booking.
// GET fetches the booking details for the manage page.
// POST performs the cancellation.

const TOKEN_RE = /^[a-f0-9]{32,64}$/

async function fetchBooking(token: string) {
  const { supabaseAdmin } = await import('@/lib/supabase')
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('cancel_token', token)
    .maybeSingle()
  if (error) throw error
  return data
}

function projectForCustomer(b: Record<string, unknown>) {
  const hours = hoursUntilSlot(b.date as string, b.start_time as string)
  const tier = cancellationTierPercent(hours)
  const paid = (b.paid_amount as number) ?? 0
  return {
    ref: b.ref,
    court: b.court,
    date: b.date,
    startTime: b.start_time,
    endTime: b.end_time,
    durationHours: b.duration_hours,
    name: b.name,
    attendance: b.attendance,
    grandTotal: b.grand_total,
    paidAmount: paid,
    hoursUntilSlot: hours,
    tierLabel: tierLabel(hours),
    tierPercent: tier,
    estimatedCredit: Math.round(paid * tier),
    isPast: hours <= 0,
    alreadyCancelled: b.attendance === 'cancelled',
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

  try {
    const booking = await fetchBooking(token)
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    return NextResponse.json({ booking: projectForCustomer(booking as Record<string, unknown>) })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const limited = rateLimit(request, 'booking-cancel', 10, 60 * 60 * 1000)
  if (limited) return limited

  const { token } = await params
  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

  const { supabaseAdmin } = await import('@/lib/supabase')

  const booking = await fetchBooking(token)
  if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

  if (booking.attendance === 'cancelled') {
    return NextResponse.json({ error: 'This booking is already cancelled' }, { status: 400 })
  }
  if (booking.attendance !== 'booked') {
    return NextResponse.json({ error: 'This booking can no longer be cancelled — contact us on WhatsApp' }, { status: 400 })
  }

  const hours = hoursUntilSlot(booking.date, booking.start_time)
  if (hours <= 0) {
    return NextResponse.json({ error: 'Slot has already started — contact us on WhatsApp' }, { status: 400 })
  }

  const result = await applyCancellationCredits(supabaseAdmin, {
    bookingId: booking.id,
    phone: booking.phone,
    paidAmount: booking.paid_amount,
    creditApplied: booking.credit_applied ?? 0,
    hoursBeforeSlot: hours,
  })

  const { error: uErr } = await supabaseAdmin
    .from('bookings')
    .update({
      attendance: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_by: 'customer',
      hours_before_slot_at_cancel: hours,
    })
    .eq('id', booking.id)
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  // Customer email — confirms cancellation + credit awarded.
  try {
    const { sendBookingCancelled } = await import('@/lib/email')
    await sendBookingCancelled({
      ref: booking.ref, court: booking.court, date: booking.date,
      startTime: booking.start_time, endTime: booking.end_time,
      durationHours: booking.duration_hours, name: booking.name,
      email: booking.email, totalPrice: booking.grand_total,
      refundCredit: result.refundCredit,
      tierLabel: tierLabel(hours),
    })
  } catch (err) {
    console.error('[email] cancellation send failed:', err)
  }

  return NextResponse.json({
    success: true,
    refundCredit: result.refundCredit,
    reversedReward: result.reversedReward,
    netCreditChange: result.net,
    tierLabel: tierLabel(hours),
  })
}
