import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Daily Vercel cron ping (see vercel.json). One trivial query per day resets
// Supabase's free-tier inactivity timer (~7 idle days → project auto-pauses),
// so the database can never pause even across club closures / quiet weeks.
export async function GET(request: NextRequest) {
  // Vercel sends `Authorization: Bearer ${CRON_SECRET}` when the env var is
  // set. Enforced only if configured — the endpoint reveals nothing either way.
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabaseAdmin
    .from('players')
    .select('id', { count: 'exact', head: true })
    .limit(1)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
