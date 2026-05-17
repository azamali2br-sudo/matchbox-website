import { NextRequest, NextResponse } from 'next/server'
import { updateDemoBooking, deleteDemoBooking } from '@/lib/mock-data'
import { requireAdmin } from '@/lib/admin-auth'

const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ALLOWED_PATCH_FIELDS = ['status'] as const

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
  for (const key of ALLOWED_PATCH_FIELDS) {
    if (key in body) update[key] = body[key]
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No allowed fields to update' }, { status: 400 })
  }

  if (DEMO_MODE) {
    const updated = updateDemoBooking(id, update)
    if (!updated) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    return NextResponse.json({ booking: updated, demoMode: true })
  }

  const { supabaseAdmin } = await import('@/lib/supabase')

  // Fetch old row first so we can detect the pending → confirmed transition.
  const { data: prev, error: fetchErr } = await supabaseAdmin
    .from('bookings')
    .select('status')
    .eq('id', id)
    .single()
  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire confirmation email on pending → confirmed (fire-and-forget)
  if (prev?.status === 'pending' && data?.status === 'confirmed') {
    import('@/lib/email').then(({ sendBookingConfirmed }) =>
      sendBookingConfirmed({
        ref: data.ref,
        court: data.court,
        date: data.date,
        startTime: data.start_time,
        endTime: data.end_time,
        durationHours: data.duration_hours,
        name: data.name,
        email: data.email,
        totalPrice: data.total_price,
      }).catch(err => console.error('[email] confirmed send failed:', err)),
    )
  }

  return NextResponse.json({ booking: data })
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
