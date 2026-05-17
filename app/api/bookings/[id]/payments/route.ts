import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { issuePrepayReward, PREPAY_REWARD_RATE } from '@/lib/credits'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED_METHODS = new Set(['bank', 'cash', 'credit', 'online', 'on_account'])

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin(request)
  if (guard) return guard

  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await request.json()
  const amount = Number(body.amount)
  const method = body.method as string | undefined
  const note = body.note as string | undefined

  if (!Number.isFinite(amount) || amount === 0 || amount < -100000 || amount > 100000) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }
  if (!method || !ALLOWED_METHODS.has(method)) {
    return NextResponse.json({ error: 'Invalid method' }, { status: 400 })
  }

  const { supabaseAdmin } = await import('@/lib/supabase')

  const { data: prev, error: fErr } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single()
  if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 })

  // Insert the payment row.
  const { error: pErr } = await supabaseAdmin.from('payments').insert({
    booking_id: id, amount, method, note: note ?? null,
  })
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  // Update paid_amount on the booking. Use server-side sum to be safe under races.
  const { data: sumRows, error: sErr } = await supabaseAdmin
    .from('payments')
    .select('amount')
    .eq('booking_id', id)
  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })
  const newPaid = (sumRows ?? []).reduce((s, r) => s + (r.amount as number), 0)

  const { data: updated, error: uErr } = await supabaseAdmin
    .from('bookings')
    .update({ paid_amount: newPaid })
    .eq('id', id)
    .select()
    .single()
  if (uErr) return NextResponse.json({ error: uErr.message }, { status: 500 })

  // Detect first-time full settlement (paid + credit_applied ≥ grand_total)
  // → issue 15% reward on the CASH-paid portion + send "confirmed" email.
  // Credit-redeemed amount doesn't earn reward (it would compound infinitely).
  const wasSettledBefore = prev.paid_amount + (prev.credit_applied ?? 0) >= prev.grand_total && prev.grand_total > 0
  const isSettledNow = newPaid + (updated.credit_applied ?? 0) >= updated.grand_total && updated.grand_total > 0
  const justBecameSettled = !wasSettledBefore && isSettledNow

  let rewardAmount = 0
  if (justBecameSettled && updated.attendance === 'booked' && method !== 'credit') {
    try {
      const r = await issuePrepayReward(supabaseAdmin, {
        bookingId: id, phone: updated.phone, paidAmount: newPaid,
      })
      rewardAmount = r.amount
    } catch (err) {
      console.error('[credits] reward issue failed:', err)
    }

    try {
      const { sendBookingConfirmed } = await import('@/lib/email')
      await sendBookingConfirmed({
        ref: updated.ref, court: updated.court, date: updated.date,
        startTime: updated.start_time, endTime: updated.end_time,
        durationHours: updated.duration_hours, name: updated.name,
        email: updated.email, totalPrice: updated.grand_total,
        creditEarned: rewardAmount,
        cancelToken: updated.cancel_token ?? undefined,
      })
    } catch (err) {
      console.error('[email] confirmed send failed:', err)
    }
  }

  return NextResponse.json({
    booking: updated,
    paidAmount: newPaid,
    rewardIssued: rewardAmount,
    rewardRate: PREPAY_REWARD_RATE,
  })
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin(request)
  if (guard) return guard

  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const { supabaseAdmin } = await import('@/lib/supabase')
  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('booking_id', id)
    .order('paid_at', { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ payments: data ?? [] })
}
