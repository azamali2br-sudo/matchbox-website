import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getTodayStr } from '@/lib/constants'
import { buildStandings, debutMonthMap, monthsWithMatches, monthLabel, type MatchRow } from '@/lib/leaderboard'

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

  const [{ data: allPlayers }, { data: rawMatches }] = await Promise.all([
    supabase.from('players').select('id, name'),
    supabase
      .from('matches')
      .select('id, played_on, created_at, team1_p1, team1_p2, team2_p1, team2_p2, team1_score, team2_score')
      .eq('status', 'approved')
      .order('played_on', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  const nameById: Record<string, string> = {}
  for (const p of allPlayers ?? []) nameById[p.id] = (p.name ?? '').trim()
  const allMatches = (rawMatches ?? []) as MatchRow[]

  const currentMonth = getTodayStr().slice(0, 7)
  const months = [...new Set([currentMonth, ...monthsWithMatches(allMatches)])].sort().reverse()
  const availableMonths = months.map(ym => ({ value: ym, label: monthLabel(ym) }))

  const debutMonth = debutMonthMap(allMatches)
  const month = view === 'month' ? (requestedMonth || currentMonth) : null
  const windowMatches = view === 'all' ? allMatches : allMatches.filter(m => m.played_on.slice(0, 7) === month)

  const { mainDraw, qualifying } = buildStandings(windowMatches, { nameById, debutMonth, month })

  return NextResponse.json({
    view, month,
    monthLabel: month ? monthLabel(month) : 'All Time',
    availableMonths,
    mainDraw, qualifying,
    totalMatches: windowMatches.length,
    totalPlayers: mainDraw.length + qualifying.length,
  })
}
