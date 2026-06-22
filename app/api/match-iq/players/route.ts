import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getTodayStr } from '@/lib/constants'
import { buildStandings, debutMonthMap, monthsWithMatches, monthLabel } from '@/lib/leaderboard'
import { loadMatchIqInputs, computeSeasonStandings, getClosedMonths, getSeasonSnapshot } from '@/lib/seasons'
import type { StandingPlayer } from '@/lib/leaderboard'

// A rated player is "dormant" (parked off the live matchmaking board, rating
// preserved — NO decay) once this many days pass without a match.
const DORMANT_DAYS = 15

// Whole days between a YYYY-MM-DD match date and today (both Karachi date-only).
function daysSince(dateStr: string | null, today: string): number | null {
  if (!dateStr) return null
  const a = Date.parse(`${dateStr}T00:00:00Z`)
  const b = Date.parse(`${today}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.max(0, Math.round((b - a) / 86_400_000))
}

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
  // Active (played within DORMANT_DAYS) and Dormant (idle longer — rating kept,
  // no decay, parked off the live board). Provisional = under 3 lifetime matches.
  if (view === 'all') {
    const debutMonth = debutMonthMap(allMatches)
    const { mainDraw, qualifying } = buildStandings(allMatches, { nameById, debutMonth, month: null })
    const today = getTodayStr()
    const ratedCount = mainDraw.length
    const toSkill = (p: StandingPlayer) => ({
      id: p.id, name: p.name, rating: p.rating,
      wins: p.wins, losses: p.losses, matches: p.matches,
      winRate: p.winRate, avgOpp: p.avgOpp,
      rank: p.rank,
      // "Top X% of rated players" — the only context shown (no labels/bands).
      topPct: p.rank ? Math.max(1, Math.round((p.rank / Math.max(1, ratedCount)) * 100)) : null,
      lastPlayedAt: p.lastPlayedAt, daysIdle: daysSince(p.lastPlayedAt, today),
    })
    // mainDraw is already sorted by rating (standingOrder), so both splits stay
    // rating-ranked; dormant keeps each player's true overall rank.
    const rated = mainDraw.map(toSkill)
    const active = rated.filter(p => (p.daysIdle ?? Infinity) < DORMANT_DAYS)
    const dormant = rated.filter(p => (p.daysIdle ?? Infinity) >= DORMANT_DAYS)
    const provisional = qualifying.map(toSkill)
    return NextResponse.json({
      view, label: 'Skill Rating', availableMonths, dormantDays: DORMANT_DAYS,
      ratedCount, active, dormant, provisional,
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
