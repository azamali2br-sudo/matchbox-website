import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { releaseLapsedHolds } from '@/lib/holds'

// Releases unpaid online bookings whose 30-minute payment hold has lapsed:
// cancels them, returns any applied credit and sends the "expired" email.
//
// Vercel Hobby crons only run once a day, so this is called every 5 minutes by
// Supabase pg_cron + pg_net (see supabase/migrations/2026-11-20_release_holds_cron.sql).
// Pages that show bookings also call releaseLapsedHolds() as a backup.
//
// Auth: same as keepalive — `Authorization: Bearer ${CRON_SECRET}` is enforced
// only if CRON_SECRET is set. Leaving it open is safe: it does exactly what any
// visitor to /booking already triggers via the public GET /api/bookings
// (release holds whose deadline has passed), and it returns only a count.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const released = await releaseLapsedHolds(supabaseAdmin)
  if (released.length > 0) {
    console.log('[cron] released lapsed holds:', released.map(r => r.ref))
  }
  return NextResponse.json({ ok: true, released: released.length })
}
