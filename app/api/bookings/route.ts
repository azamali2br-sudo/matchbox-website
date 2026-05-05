import { NextRequest, NextResponse } from 'next/server'
import { getDemoBookings, addDemoBooking, type Booking } from '@/lib/mock-data'
import { generateBookingRef, getTotalPrice, addHoursToTime } from '@/lib/constants'

const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const court = searchParams.get('court')

  if (DEMO_MODE) {
    let bookings = getDemoBookings()
    if (date) bookings = bookings.filter(b => b.date === date)
    if (court) bookings = bookings.filter(b => b.court === court)
    return NextResponse.json({ bookings, demoMode: true })
  }

  // ── Supabase implementation (uncomment when connected) ──────────────────
  // const { createClient } = await import('@/lib/supabase')
  // const supabase = createClient()
  // let query = supabase.from('bookings').select('*').neq('status', 'cancelled')
  // if (date) query = query.eq('date', date)
  // if (court) query = query.eq('court', court)
  // const { data, error } = await query
  // if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // return NextResponse.json({ bookings: data })
  // ────────────────────────────────────────────────────────────────────────

  return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { court, date, startTime, durationHours, name, phone, email } = body

  if (!court || !date || !startTime || !durationHours || !name || !phone || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

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
  }

  if (DEMO_MODE) {
    addDemoBooking(newBooking)
    return NextResponse.json({ booking: newBooking, demoMode: true })
  }

  // ── Supabase implementation ──────────────────────────────────────────────
  // const { createClient } = await import('@/lib/supabase')
  // const supabase = createClient()
  // const { data, error } = await supabase.from('bookings').insert(newBooking).select().single()
  // if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // return NextResponse.json({ booking: data })
  // ────────────────────────────────────────────────────────────────────────

  return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
}
