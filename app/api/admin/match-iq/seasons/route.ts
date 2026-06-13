import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { getTodayStr } from '@/lib/constants'
import { monthsWithMatches, monthLabel } from '@/lib/leaderboard'
import { loadMatchIqInputs, computeSeasonStandings } from '@/lib/seasons'

// Admin-only. Lists every month that has matches with its closed/open state,
// and closes or reopens a month. Closing freezes that month's final standings +
// badges into match_iq_seasons; reopening removes the snapshot so it recomputes
// live again.

export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (guard) return guard

  const [{ allMatches }, { data: seasons }] = await Promise.all([
    loadMatchIqInputs(),
    supabaseAdmin.from('match_iq_seasons').select('month, closed_at'),
  ])
  const closedAt = new Map((seasons ?? []).map((s: { month: string; closed_at: string }) => [s.month, s.closed_at]))
  const currentMonth = getTodayStr().slice(0, 7)

  const months = monthsWithMatches(allMatches).map(ym => ({
    month: ym,
    label: monthLabel(ym),
    closed: closedAt.has(ym),
    closedAt: closedAt.get(ym) ?? null,
    isCurrent: ym === currentMonth,
  }))

  return NextResponse.json({ months, currentMonth })
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (guard) return guard

  const { month, action } = await request.json()
  if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
  }

  if (action === 'reopen') {
    const { error } = await supabaseAdmin.from('match_iq_seasons').delete().eq('month', month)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, closed: false })
  }

  if (action !== 'close') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const { nameById, allMatches } = await loadMatchIqInputs()
  const standings = computeSeasonStandings(month, nameById, allMatches)
  if (standings.totalMatches === 0) {
    return NextResponse.json({ error: 'No matches in that month — nothing to freeze.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('match_iq_seasons')
    .upsert({ month, standings, closed_at: new Date().toISOString(), closed_by: 'admin' }, { onConflict: 'month' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const champion = standings.mainDraw[0]?.name ?? null
  return NextResponse.json({ success: true, closed: true, champion, totalMatches: standings.totalMatches })
}
