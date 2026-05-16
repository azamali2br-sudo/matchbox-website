import { NextRequest, NextResponse } from 'next/server'
import { getDemoBookings, addDemoBooking, expireHolds, type Booking } from '@/lib/mock-data'
import { generateBookingRef, getTotalPrice, addHoursToTime, HOLD_DURATION_MINUTES } from '@/lib/constants'
import { verifySessionToken, ADMIN_COOKIE } from '@/lib/admin-auth'
import { rateLimit } from '@/lib/rate-limit'
import { cookies } from 'next/headers'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const PHONE_RE = /^[+\d][\d\s()-]{6,19}$/
const ALLOWED_COURTS = new Set(['A', 'B'])
const ALLOWED_DURATIONS = new Set([1, 1.5, 2, 2.5, 3])

const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL

function toBooking(row: Record<string, unknown>): Booking {
  return {
    id: row.id as string,
    court: row.court as 'A' | 'B',
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

function stripPii(b: Booking): Partial<Booking> {
  return {
    id: b.id,
    court: b.court,
    date: b.date,
    startTime: b.startTime,
    endTime: b.endTime,
    durationHours: b.durationHours,
    status: b.status,
    holdExpiresAt: b.holdExpiresAt,
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const date = searchParams.get('date')
  const court = searchParams.get('court')

  const store = await cookies()
  const isAdmin = verifySessionToken(store.get(ADMIN_COOKIE)?.value)

  if (DEMO_MODE) {
    expireHolds()
    let bookings = getDemoBookings()
    if (date) bookings = bookings.filter(b => b.date === date)
    if (court) bookings = bookings.filter(b => b.court === court)
    return NextResponse.json({
      bookings: isAdmin ? bookings : bookings.map(stripPii),
      demoMode: true,
    })
  }

  const { supabase, supabaseAdmin } = await import('@/lib/supabase')

  // Expire pending holds (admin key — anon doesn't have UPDATE policy)
  await supabaseAdmin
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('status', 'pending')
    .lt('hold_expires_at', new Date().toISOString())

  // Public callers get only slot-availability fields; admin gets full rows
  const selectFields = isAdmin
    ? '*'
    : 'id, court, date, start_time, end_time, duration_hours, status, hold_expires_at'

  let query = (isAdmin ? supabaseAdmin : supabase)
    .from('bookings')
    .select(selectFields)
  // Hide cancelled from public callers so the slot frees up;
  // admin sees the full history (needed for the Cancelled filter & revenue view).
  if (!isAdmin) query = query.neq('status', 'cancelled')
  if (date) query = query.eq('date', date)
  if (court) query = query.eq('court', court)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  return NextResponse.json({
    bookings: rows.map(r => (isAdmin ? toBooking(r) : stripPii(toBooking({ ...r, name: '', phone: '', email: '', total_price: 0, ref: '', created_at: '' })))),
  })
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'booking-create', 5, 60 * 60 * 1000)
  if (limited) return limited

  const body = await request.json()
  const { court, date, startTime, durationHours, name, phone, email } = body

  if (!court || !date || !startTime || !durationHours || !name || !phone || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!ALLOWED_COURTS.has(court)) {
    return NextResponse.json({ error: 'Invalid court' }, { status: 400 })
  }
  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }
  if (!ALLOWED_DURATIONS.has(Number(durationHours))) {
    return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }
  if (!PHONE_RE.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
  }
  if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
    return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
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

  const booking = toBooking(data)

  // Fire-and-forget: email failures must never block a booking
  import('@/lib/email').then(({ sendBookingConfirmation }) =>
    sendBookingConfirmation({
      ref: booking.ref,
      court: booking.court,
      date: booking.date,
      startTime: booking.startTime,
      endTime: booking.endTime,
      durationHours: booking.durationHours,
      name: booking.name,
      email: booking.email,
      totalPrice: booking.totalPrice,
      holdExpiresAt: booking.holdExpiresAt,
    }).catch(err => console.error('[email] send failed:', err)),
  )

  return NextResponse.json({ booking })
}
