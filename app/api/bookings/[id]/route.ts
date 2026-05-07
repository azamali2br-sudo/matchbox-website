import { NextRequest, NextResponse } from 'next/server'
import { updateDemoBooking, deleteDemoBooking } from '@/lib/mock-data'

const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()

  if (DEMO_MODE) {
    const updated = updateDemoBooking(id, body)
    if (!updated) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    return NextResponse.json({ booking: updated, demoMode: true })
  }

  const { supabaseAdmin } = await import('@/lib/supabase')
  const { data, error } = await supabaseAdmin
    .from('bookings')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ booking: data })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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
