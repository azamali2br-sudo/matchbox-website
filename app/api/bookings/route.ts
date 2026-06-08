import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getDemoBookings, addDemoBooking, expireHolds, deriveStatus, type Booking } from '@/lib/mock-data'
import { generateBookingRef, getTotalPrice, addHoursToTime, HOLD_DURATION_MINUTES } from '@/lib/constants'
import { verifySessionToken, ADMIN_COOKIE } from '@/lib/admin-auth'
import { getCurrentAccountId } from '@/lib/account-auth'
import { getAccountById } from '@/lib/accounts'
import { getCreditBalance, redeemCredit } from '@/lib/credits'
import { normalizePhone } from '@/lib/phone'
import { rateLimit } from '@/lib/rate-limit'
import { cookies } from 'next/headers'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ALLOWED_COURTS = new Set(['A', 'B'])
const ALLOWED_DURATIONS = new Set([1, 1.5, 2, 2.5, 3])

const DEMO_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL

// Map a Supabase row to the rich Booking shape used by the app.
function toBooking(row: Record<string, unknown>): Booking {
  const attendance = (row.attendance as Booking['attendance']) ?? 'booked'
  const paidAmount = (row.paid_amount as number) ?? 0
  const grandTotal = (row.grand_total as number) ?? (row.court_total as number) ?? 0
  return {
    id: row.id as string,
    ref: row.ref as string,
    court: row.court as 'A' | 'B',
    date: row.date as string,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    durationHours: row.duration_hours as number,
    name: row.name as string,
    phone: row.phone as string,
    email: row.email as string,
    attendance,
    courtTotal: (row.court_total as number) ?? 0,
    extrasTotal: (row.extras_total as number) ?? 0,
    grandTotal,
    creditApplied: (row.credit_applied as number) ?? 0,
    paidAmount,
    totalPrice: grandTotal, // legacy alias
    status: deriveStatus({ attendance, paidAmount, creditApplied: (row.credit_applied as number) ?? 0, grandTotal }),
    holdExpiresAt: (row.hold_expires_at as string | null) ?? undefined,
    termsAcceptedAt: (row.terms_accepted_at as string | null) ?? undefined,
    cancelToken: (row.cancel_token as string | null) ?? undefined,
    cancelledAt: (row.cancelled_at as string | null) ?? undefined,
    cancelledBy: (row.cancelled_by as 'customer' | 'admin' | null) ?? undefined,
    hoursBeforeSlotAtCancel: (row.hours_before_slot_at_cancel as number | null) ?? undefined,
    adminNote: (row.admin_note as string | null) ?? undefined,
    source: (row.source as Booking['source']) ?? 'online',
    createdAt: row.created_at as string,
  }
}

// PII-stripped projection for public callers (slot availability only).
function stripPii(b: Booking): Partial<Booking> {
  return {
    id: b.id,
    court: b.court,
    date: b.date,
    startTime: b.startTime,
    endTime: b.endTime,
    durationHours: b.durationHours,
    status: b.status,
    attendance: b.attendance,
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

  // Expire pending holds — flip attendance='cancelled' on any 'booked' row
  // whose hold lapsed without payment. .select() returns the freshly-cancelled
  // rows so we can fire one email per release.
  const { data: expired } = await supabaseAdmin
    .from('bookings')
    .update({ attendance: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: 'admin' })
    .eq('attendance', 'booked')
    .eq('paid_amount', 0)
    .lt('hold_expires_at', new Date().toISOString())
    .select()

  if (expired && expired.length > 0) {
    try {
      const { sendBookingExpired } = await import('@/lib/email')
      await Promise.all(expired.map(row => {
        const b = toBooking(row as Record<string, unknown>)
        return sendBookingExpired({
          ref: b.ref, court: b.court, date: b.date, startTime: b.startTime,
          endTime: b.endTime, durationHours: b.durationHours, name: b.name,
          email: b.email, totalPrice: b.grandTotal,
        }).catch(err => console.error('[email] expired send failed:', err))
      }))
    } catch (err) {
      console.error('[email] expired batch failed:', err)
    }
  }

  // Admin sees everything (full row, includes cancelled for history).
  // Public callers see only slot-availability fields, non-cancelled.
  const selectFields = isAdmin
    ? '*'
    : 'id, court, date, start_time, end_time, duration_hours, attendance, hold_expires_at, paid_amount, court_total, extras_total, grand_total'

  let query = (isAdmin ? supabaseAdmin : supabase)
    .from('bookings')
    .select(selectFields)
  if (!isAdmin) query = query.neq('attendance', 'cancelled')
  if (date) query = query.eq('date', date)
  if (court) query = query.eq('court', court)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data ?? []) as unknown as Record<string, unknown>[]
  if (isAdmin) {
    return NextResponse.json({ bookings: rows.map(toBooking) })
  }
  return NextResponse.json({
    bookings: rows.map(r => stripPii(toBooking({ ...r, name: '', phone: '', email: '', ref: '', created_at: '' }))),
  })
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'booking-create', 5, 60 * 60 * 1000)
  if (limited) return limited

  const body = await request.json()
  const { court, date, startTime, durationHours, termsAccepted } = body

  // ── Who is booking? ──────────────────────────────────────────────
  // Online self-service requires a logged-in account (identity comes from the
  // session, never the body — so it can't be spoofed). Admin (manual / WhatsApp)
  // bookings bypass the gate and supply the customer's details directly.
  const store = await cookies()
  const isAdmin = verifySessionToken(store.get(ADMIN_COOKIE)?.value)

  let name: string, phone: string, email: string, source: 'online' | 'admin' | 'whatsapp'
  let accountPhone: string | null = null

  if (isAdmin) {
    // Manual booking — trust the admin-entered customer details.
    name = typeof body.name === 'string' ? body.name.trim() : ''
    phone = normalizePhone(typeof body.phone === 'string' ? body.phone : '')
    email = typeof body.email === 'string' ? body.email.trim() : ''
    source = body.source === 'admin' ? 'admin' : 'whatsapp'
    if (name.length < 2 || name.length > 100) return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    if (!/^\+\d{8,15}$/.test(phone)) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
    if (email && !EMAIL_RE.test(email)) return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  } else {
    // Online — must be logged in. Identity is the account, full stop.
    const accountId = await getCurrentAccountId()
    if (!accountId) {
      return NextResponse.json({ error: 'Please log in to book.', needsAuth: true }, { status: 401 })
    }
    if (!DEMO_MODE) {
      const { supabaseAdmin } = await import('@/lib/supabase')
      const account = await getAccountById(supabaseAdmin, accountId)
      if (!account) return NextResponse.json({ error: 'Please log in to book.', needsAuth: true }, { status: 401 })
      name = account.name
      phone = account.phone
      email = account.email || ''
      accountPhone = account.phone
    } else {
      // Demo fallback (no real accounts table) — accept body identity.
      name = typeof body.name === 'string' ? body.name.trim() : 'Demo Player'
      phone = normalizePhone(typeof body.phone === 'string' ? body.phone : '03000000000')
      email = typeof body.email === 'string' ? body.email.trim() : 'demo@matchbox'
    }
    source = 'online'
    if (!termsAccepted) {
      return NextResponse.json({ error: 'You must accept the terms to book' }, { status: 400 })
    }
  }

  if (!court || !date || !startTime || !durationHours) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (!ALLOWED_COURTS.has(court)) return NextResponse.json({ error: 'Invalid court' }, { status: 400 })
  if (!DATE_RE.test(date)) return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  if (!ALLOWED_DURATIONS.has(Number(durationHours))) return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })

  // Slot must not have started yet.
  const slotStartMs = new Date(`${date}T${startTime}:00+05:00`).getTime()
  const nowMs = Date.now()
  if (slotStartMs <= nowMs) {
    return NextResponse.json({ error: 'This slot has already started' }, { status: 400 })
  }

  // Daily closure 09:00–15:00 PKT.
  const [sh, sm] = startTime.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin = startMin + Math.round(Number(durationHours) * 60)
  if (startMin < 15 * 60 && endMin > 9 * 60) {
    return NextResponse.json({ error: 'Matchbox is closed 9 AM – 3 PM' }, { status: 400 })
  }

  // Hold can't extend past slot start.
  const defaultHoldMs = nowMs + HOLD_DURATION_MINUTES * 60 * 1000
  const holdExpiresAt = new Date(Math.min(defaultHoldMs, slotStartMs)).toISOString()
  const cancelToken = randomBytes(24).toString('hex')
  const courtTotal = getTotalPrice(startTime, durationHours)

  if (DEMO_MODE) {
    const ref = generateBookingRef()
    const newBooking: Booking = {
      id: Math.random().toString(36).slice(2),
      ref,
      court, date, startTime,
      endTime: addHoursToTime(startTime, durationHours),
      durationHours,
      name, phone, email,
      attendance: 'booked',
      status: 'pending',
      courtTotal,
      extrasTotal: 0,
      grandTotal: courtTotal,
      totalPrice: courtTotal,
      creditApplied: 0,
      paidAmount: 0,
      holdExpiresAt,
      termsAcceptedAt: new Date().toISOString(),
      cancelToken,
      source,
      createdAt: new Date().toISOString(),
    }
    addDemoBooking(newBooking)
    return NextResponse.json({ booking: newBooking, demoMode: true })
  }

  const { supabase } = await import('@/lib/supabase')

  const row = {
    ref: generateBookingRef(),
    court, date,
    start_time: startTime,
    end_time: addHoursToTime(startTime, durationHours),
    duration_hours: durationHours,
    name, phone, email,
    attendance: 'booked',
    court_total: courtTotal,
    extras_total: 0,
    credit_applied: 0,
    paid_amount: 0,
    hold_expires_at: holdExpiresAt,
    terms_accepted_at: new Date().toISOString(),
    cancel_token: cancelToken,
    source,
  }

  const { data, error } = await supabase.from('bookings').insert(row).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const booking = toBooking(data)

  // Apply credit at checkout (online + logged in only). Caps at min(balance, owed).
  if (!isAdmin && accountPhone && Number(body.applyCredit) > 0) {
    try {
      const { supabaseAdmin } = await import('@/lib/supabase')
      const balance = await getCreditBalance(supabaseAdmin, accountPhone)
      const owed = booking.grandTotal - booking.paidAmount - booking.creditApplied
      const amount = Math.min(Number(body.applyCredit), balance, owed)
      if (amount > 0) {
        const { newCreditApplied } = await redeemCredit(supabaseAdmin, {
          phone: accountPhone, bookingId: booking.id, amount, currentCreditApplied: booking.creditApplied,
        })
        booking.creditApplied = newCreditApplied
        booking.status = deriveStatus({ attendance: booking.attendance, paidAmount: booking.paidAmount, creditApplied: newCreditApplied, grandTotal: booking.grandTotal })
      }
    } catch (err) {
      console.error('[credit] redeem at checkout failed:', err)
    }
  }

  // Pending-payment email — online bookings with an email on file only.
  // (Manual/admin bookings are arranged directly, so no automated email.)
  if (source === 'online' && booking.email) {
    try {
      const { sendBookingConfirmation } = await import('@/lib/email')
      await sendBookingConfirmation({
        ref: booking.ref, court: booking.court, date: booking.date,
        startTime: booking.startTime, endTime: booking.endTime,
        durationHours: booking.durationHours, name: booking.name,
        email: booking.email, totalPrice: booking.grandTotal,
        holdExpiresAt: booking.holdExpiresAt, cancelToken: booking.cancelToken,
      })
    } catch (err) {
      console.error('[email] send failed:', err)
    }
  }

  return NextResponse.json({ booking })
}
