import { NextRequest, NextResponse } from 'next/server'
import { updateDemoBooking, deleteDemoBooking, type Attendance } from '@/lib/mock-data'
import { requireAdmin } from '@/lib/admin-auth'
import { applyCancellationCredits, hoursUntilSlot } from '@/lib/credits'

const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ALLOWED_ATTENDANCE: Attendance[] = ['booked', 'attended', 'no_show', 'cancelled']

// Allowed transitions: booked → {attended, no_show, cancelled}; attended ↔ no_show.
// 'cancelled' is terminal (re-opening a cancelled booking would need a fresh booking).
function isValidAttendanceTransition(from: Attendance, to: Attendance): boolean {
  if (from === to) return true
  if (from === 'cancelled') return false
  if (from === 'booked') return ['attended', 'no_show', 'cancelled'].includes(to)
  // attended ↔ no_show OK; either can still be cancelled if admin needs to nuke it.
  if (from === 'attended' || from === 'no_show') return ['attended', 'no_show', 'cancelled'].includes(to)
  return false
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin(request)
  if (guard) return guard

  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const body = await request.json()
  const update: Record<string, unknown> = {}

  if ('attendance' in body) {
    if (!ALLOWED_ATTENDANCE.includes(body.attendance)) {
      return NextResponse.json({ error: 'Invalid attendance' }, { status: 400 })
    }
    update.attendance = body.attendance
  }
  if ('admin_note' in body) {
    if (body.admin_note !== null && typeof body.admin_note !== 'string') {
      return NextResponse.json({ error: 'Invalid admin_note' }, { status: 400 })
    }
    update.admin_note = body.admin_note
  }
  if ('extras_total' in body) {
    const v = Number(body.extras_total)
    if (!Number.isFinite(v) || v < 0 || v > 100000) {
      return NextResponse.json({ error: 'Invalid extras_total' }, { status: 400 })
    }
    update.extras_total = v
  }
  if ('court_total' in body) {
    const v = Number(body.court_total)
    if (!Number.isFinite(v) || v < 0 || v > 100000) {
      return NextResponse.json({ error: 'Invalid court_total' }, { status: 400 })
    }
    update.court_total = v
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No allowed fields to update' }, { status: 400 })
  }

  if (DEMO_MODE) {
    const updated = updateDemoBooking(id, update as never)
    if (!updated) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    return NextResponse.json({ booking: updated, demoMode: true })
  }

  const { supabaseAdmin } = await import('@/lib/supabase')

  // Fetch prior state to validate transitions + drive side effects.
  const { data: prev, error: fetchErr } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('id', id)
    .single()
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  // Validate attendance transition if changing.
  if (update.attendance && !isValidAttendanceTransition(prev.attendance, update.attendance as Attendance)) {
    return NextResponse.json(
      { error: `Cannot change attendance from ${prev.attendance} to ${update.attendance}` },
      { status: 400 },
    )
  }

  // If admin is cancelling, stamp cancellation metadata.
  let cancellationResult: { refundCredit: number; reversedReward: number; net: number } | null = null
  if (update.attendance === 'cancelled' && prev.attendance !== 'cancelled') {
    const hours = hoursUntilSlot(prev.date, prev.start_time)
    update.cancelled_at = new Date().toISOString()
    update.cancelled_by = 'admin'
    update.hours_before_slot_at_cancel = hours
    cancellationResult = await applyCancellationCredits(supabaseAdmin, {
      bookingId: id,
      phone: prev.phone,
      paidAmount: prev.paid_amount,
      creditApplied: prev.credit_applied ?? 0,
      hoursBeforeSlot: hours,
    })
  }

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ booking: data, cancellation: cancellationResult })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await requireAdmin(request)
  if (guard) return guard

  const { id } = await params
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  if (DEMO_MODE) {
    const deleted = deleteDemoBooking(id)
    if (!deleted) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    return NextResponse.json({ success: true, demoMode: true })
  }

  const { supabaseAdmin } = await import('@/lib/supabase')
  const { error } = await supabaseAdmin.from('bookings').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
