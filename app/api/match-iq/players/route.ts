import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getTodayStr } from '@/lib/constants'
import { buildStandings, debutMonthMap, monthsWithMatches, monthLabel, daysSince, DORMANT_DAYS } from '@/lib/leaderboard'
import { loadMatchIqInputs, computeSeasonStandings, getClosedMonths, getSeasonSnapshot } from '@/lib/seasons'
import type { StandingPlayer } from '@/lib/leaderboard'

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

  // All-time SKILL RATING — the persistent, never-reset number used for
  // matchmaking (the monthly board, above, is the competition/recency number).
  // One continuous Elo replay over every match. Badges are a per-month concept,
  // so they're absent here. Rated players (3+ lifetime matches) are split into
  // Active (played within DORMANT_DAYS — the only ones ranked) and Dormant
  // (idle longer — rating kept, no decay, unranked until their next match).
  // Provisional = under 3 lifetime matches.
  if (view === 'all') {
    const debutMonth = debutMonthMap(allMatches)
    const today = getTodayStr()
    const { mainDraw, qualifying, dormant } = buildStandings(allMatches, { nameById, debutMonth, month: null, asOf: today })
    const activeCount = mainDraw.length
    const ratedCount = activeCount + dormant.length
    const toSkill = (p: StandingPlayer) => ({
      id: p.id, name: p.name, rating: p.rating,
      wins: p.wins, losses: p.losses, matches: p.matches,
      winRate: p.winRate, avgOpp: p.avgOpp,
      rank: p.rank,
      // "Top X% of active players" — the only context shown (no labels/bands).
      topPct: p.rank ? Math.max(1, Math.round((p.rank / Math.max(1, activeCount)) * 100)) : null,
      lastPlayedAt: p.lastPlayedAt, daysIdle: daysSince(p.lastPlayedAt, today),
    })
    return NextResponse.json({
      view, label: 'Skill Rating', availableMonths, dormantDays: DORMANT_DAYS,
      ratedCount, active: mainDraw.map(toSkill), dormant: dormant.map(toSkill), provisional: qualifying.map(toSkill),
      totalMatches: allMatches.length, totalPlayers: ratedCount + qualifying.length,
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
