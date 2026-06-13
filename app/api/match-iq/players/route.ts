import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getTodayStr } from '@/lib/constants'
import { buildStandings, debutMonthMap, monthsWithMatches, monthLabel } from '@/lib/leaderboard'
import { loadMatchIqInputs, computeSeasonStandings, getClosedMonths, getSeasonSnapshot } from '@/lib/seasons'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone')

  // Lookup-by-phone (used during match submission) — id + name only.
  if (phone) {
    const { data, error } = await supabase.from('players').select('id, name').eq('phone', phone).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ player: data })
  }

  const view = searchParams.get('view') === 'all' ? 'all' : 'month'
  const requestedMonth = searchParams.get('month')

  const [{ nameById, allMatches }, closedMonths] = await Promise.all([
    loadMatchIqInputs(),
    getClosedMonths(),
  ])

  const currentMonth = getTodayStr().slice(0, 7)
  const months = [...new Set([currentMonth, ...monthsWithMatches(allMatches)])].sort().reverse()
  const availableMonths = months.map(ym => ({ value: ym, label: monthLabel(ym), closed: closedMonths.has(ym) }))

  // All-time view: always a live replay across every match (never frozen). The
  // toggle is hidden from the UI, but this path is kept intact so career data
  // stays queryable and the feature can be re-enabled later. Badges are a
  // per-month concept, so they're stripped here (an all-time board is pure
  // career stats — rank already conveys "best ever").
  if (view === 'all') {
    const debutMonth = debutMonthMap(allMatches)
    const { mainDraw, qualifying } = buildStandings(allMatches, { nameById, debutMonth, month: null })
    const stripBadges = (p: typeof mainDraw[number]) => ({ ...p, badges: [] })
    return NextResponse.json({
      view, month: null, monthLabel: 'All Time', availableMonths, closed: false, isCurrentMonth: false,
      mainDraw: mainDraw.map(stripBadges), qualifying: qualifying.map(stripBadges),
      totalMatches: allMatches.length, totalPlayers: mainDraw.length + qualifying.length,
    })
  }

  // Monthly view: a closed month serves its frozen snapshot; an open month
  // recomputes live as before. isCurrentMonth gates the live "Hot Streak"
  // indicator (only meaningful for the in-progress month).
  const month = requestedMonth || currentMonth
  const isCurrentMonth = month === currentMonth
  if (closedMonths.has(month)) {
    const snap = await getSeasonSnapshot(month)
    if (snap) {
      return NextResponse.json({ view, month, monthLabel: monthLabel(month), availableMonths, closed: true, isCurrentMonth, ...snap })
    }
  }

  const live = computeSeasonStandings(month, nameById, allMatches)
  return NextResponse.json({ view, month, monthLabel: monthLabel(month), availableMonths, closed: false, isCurrentMonth, ...live })
}
