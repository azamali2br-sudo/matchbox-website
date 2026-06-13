import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { buildStandings, debutMonthMap, monthsWithMatches, monthLabel, type MatchRow } from '@/lib/leaderboard'
import type { BadgeKey } from '@/lib/badges'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const [playerRes, historyRes, matchesRes, allPlayersRes, allMatchesRes] = await Promise.all([
    supabase.from('players').select('id, name, rating, wins, losses, created_at').eq('id', id).single(),
    supabase.from('rating_history').select('rating, created_at').eq('player_id', id).order('created_at', { ascending: true }),
    supabase
      .from('matches')
      .select(`
        id, played_on, team1_score, team2_score, set_scores, status, created_at,
        p1:players!team1_p1(id, name, rating),
        p2:players!team1_p2(id, name, rating),
        p3:players!team2_p1(id, name, rating),
        p4:players!team2_p2(id, name, rating)
      `)
      .eq('status', 'approved')
      .or(`team1_p1.eq.${id},team1_p2.eq.${id},team2_p1.eq.${id},team2_p2.eq.${id}`)
      .order('played_on', { ascending: false })
      .limit(20),
    supabase.from('players').select('id, name'),
    supabase
      .from('matches')
      .select('id, played_on, created_at, team1_p1, team1_p2, team2_p1, team2_p2, team1_score, team2_score')
      .eq('status', 'approved')
      .order('played_on', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  if (playerRes.error) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  // ── Trophy case + all-time standing (shared engine) ──────────────────────
  const nameById: Record<string, string> = {}
  for (const p of allPlayersRes.data ?? []) nameById[p.id] = (p.name ?? '').trim()
  const allMatches = (allMatchesRes.data ?? []) as MatchRow[]
  const debutMonth = debutMonthMap(allMatches)

  // All-time standing for this player (rank, avg opp).
  const allTimeStandings = buildStandings(allMatches, { nameById, debutMonth, month: null })
  const allRow = [...allTimeStandings.mainDraw, ...allTimeStandings.qualifying].find(p => p.id === id) ?? null

  // Per-month badges → trophy case (newest first, only months they earned something).
  const trophyCase: { month: string; monthLabel: string; rank: number | null; badges: BadgeKey[] }[] = []
  for (const ym of monthsWithMatches(allMatches)) {
    const monthMatches = allMatches.filter(m => m.played_on.slice(0, 7) === ym)
    const { mainDraw } = buildStandings(monthMatches, { nameById, debutMonth, month: ym })
    const row = mainDraw.find(p => p.id === id)
    if (row && row.badges.length) trophyCase.push({ month: ym, monthLabel: monthLabel(ym), rank: row.rank, badges: row.badges })
  }

  return NextResponse.json({
    player: playerRes.data,
    ratingHistory: historyRes.data ?? [],
    matches: matchesRes.data ?? [],
    allTime: allRow ? { rank: allRow.rank, avgOpp: allRow.avgOpp, matches: allRow.matches } : null,
    trophyCase,
  })
}
