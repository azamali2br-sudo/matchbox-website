import { NextRequest, NextResponse } from 'next/server'
import { getDemoBookings, addDemoBooking, expireHolds, type Booking } from '@/lib/mock-data'
import { generateBookingRef, getTotalPrice, addHoursToTime, HOLD_DURATION_MINUTES } from '@/lib/constants'

const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL

function toBooking(row: Record<string, unknown>): Booking {
  return {
    id: row.id as string,
    court: row.court as string,
    date: row.date as string,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    durationHours: row.duration_hours as number,
    name: row.name as string,
    phone: row.phone as string,
    email: row.email as string,
    status: row.status as 'pending' | 'confirmed' | 'cancelled',
    totalPrice: row.total_price as number,
    ref: row.ref as string,
    createdAt: row.created_at as string,
    holdExpiresAt: row.hold_expires_at as string | undefined,
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const court = searchParams.get('court')

  if (DEMO_MODE) {
    expireHolds()
    let bookings = getDemoBookings()
    if (date) bookings = bookings.filter(b => b.date === date)
    if (court) bookings = bookings.filter(b => b.court === court)
    return NextResponse.json({ bookings, demoMode: true })
  }

  const { supabase } = await import('@/lib/supabase')

  // Expire pending holds
  await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('status', 'pending')
    .lt('hold_expires_at', new Date().toISOString())

  let query = supabase.from('bookings').select('*').neq('status', 'cancelled')
  if (date) query = query.eq('date', date)
  if (court) query = query.eq('court', court)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ bookings: (data ?? []).map(toBooking) })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { court, date, startTime, durationHours, name, phone, email } = body

  if (!court || !date || !startTime || !durationHours || !name || !phone || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MINUTES * 60 * 1000).toISOString()

  if (DEMO_MODE) {
    const newBooking: Booking = {
      id: Math.random().toString(36).slice(2),
      court,
      date,
      startTime,
      endTime: addHoursToTime(startTime, durationHours),
      durationHours,
      name,
      phone,
      email,
      status: 'pending',
      totalPrice: getTotalPrice(startTime, durationHours),
      ref: generateBookingRef(),
      createdAt: new Date().toISOString(),
      holdExpiresAt,
    }
    addDemoBooking(newBooking)
    return NextResponse.json({ booking: newBooking, demoMode: true })
  }

  const { supabase } = await import('@/lib/supabase')

  const row = {
    court,
    date,
    start_time: startTime,
    end_time: addHoursToTime(startTime, durationHours),
    duration_hours: durationHours,
    name,
    phone,
    email,
    status: 'pending',
    total_price: getTotalPrice(startTime, durationHours),
    ref: generateBookingRef(),
    hold_expires_at: holdExpiresAt,
  }

  const { data, error } = await supabase.from('bookings').insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ booking: toBooking(data) })
}
