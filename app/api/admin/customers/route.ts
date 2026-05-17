import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { NO_SHOW_FLAG_THRESHOLD } from '@/lib/credits'

// GET /api/admin/customers — phone-grouped ledger of all customers.
// Returns: phone, name (most recent), total sessions, attended, no_show, cancel counts
// (split by tier), outstanding amount, current credit balance, last visit.

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (guard) return guard

  const { supabaseAdmin } = await import('@/lib/supabase')

  const [{ data: bookings, error: bErr }, { data: credits, error: cErr }] = await Promise.all([
    supabaseAdmin.from('bookings')
      .select('phone, name, date, start_time, attendance, grand_total, paid_amount, credit_applied, hours_before_slot_at_cancel, cancelled_by'),
    supabaseAdmin.from('credits').select('phone, amount, expires_at'),
  ])
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 })
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 })

  const now = new Date()
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)
  const nowIso = now.toISOString()
  const sixMonthsAgoIso = sixMonthsAgo.toISOString().slice(0, 10) // date column = YYYY-MM-DD

  type CustomerAgg = {
    phone: string
    name: string
    lastDate: string
    sessions: number
    attended: number
    noShow: number
    noShowRecent: number
    cancels: { tier24: number; tier224: number; tierUnder2: number; total: number }
    outstanding: number
    creditBalance: number
    flagged: boolean
  }

  const map = new Map<string, CustomerAgg>()

  for (const b of bookings ?? []) {
    const phone = b.phone as string
    if (!phone) continue
    const cur = map.get(phone) ?? {
      phone,
      name: b.name as string,
      lastDate: '',
      sessions: 0,
      attended: 0,
      noShow: 0,
      noShowRecent: 0,
      cancels: { tier24: 0, tier224: 0, tierUnder2: 0, total: 0 },
      outstanding: 0,
      creditBalance: 0,
      flagged: false,
    }

    // Most-recent name wins (by date).
    if ((b.date as string) >= cur.lastDate) {
      cur.name = b.name as string
      cur.lastDate = b.date as string
    }

    cur.sessions += 1
    if (b.attendance === 'attended') cur.attended += 1
    if (b.attendance === 'no_show') {
      cur.noShow += 1
      if ((b.date as string) >= sixMonthsAgoIso) cur.noShowRecent += 1
    }
    if (b.attendance === 'cancelled') {
      cur.cancels.total += 1
      const hrs = (b.hours_before_slot_at_cancel as number | null) ?? 0
      if (hrs >= 24) cur.cancels.tier24 += 1
      else if (hrs >= 2) cur.cancels.tier224 += 1
      else cur.cancels.tierUnder2 += 1
    }

    // Outstanding = grand_total - paid - credit_applied, on non-cancelled bookings.
    if (b.attendance !== 'cancelled') {
      const owed = (b.grand_total as number) - (b.paid_amount as number) - (b.credit_applied as number ?? 0)
      if (owed > 0) cur.outstanding += owed
    }

    map.set(phone, cur)
  }

  // Roll credits into the same map.
  for (const c of credits ?? []) {
    const phone = c.phone as string
    if (!phone) continue
    if (c.expires_at && (c.expires_at as string) < nowIso) continue
    const cur = map.get(phone)
    if (cur) {
      cur.creditBalance += c.amount as number
    } else {
      // Customer with credit but no bookings ever (rare — manual_adjust seeded).
      map.set(phone, {
        phone, name: '(credit only)', lastDate: '',
        sessions: 0, attended: 0, noShow: 0, noShowRecent: 0,
        cancels: { tier24: 0, tier224: 0, tierUnder2: 0, total: 0 },
        outstanding: 0,
        creditBalance: c.amount as number,
        flagged: false,
      })
    }
  }

  for (const c of map.values()) {
    c.flagged = c.noShowRecent >= NO_SHOW_FLAG_THRESHOLD
  }

  const customers = Array.from(map.values()).sort((a, b) => (b.lastDate || '').localeCompare(a.lastDate || ''))
  return NextResponse.json({ customers, noShowFlagThreshold: NO_SHOW_FLAG_THRESHOLD })
}
