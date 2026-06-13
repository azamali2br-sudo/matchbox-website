import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { buildStandings, debutMonthMap, monthsWithMatches, monthLabel } from '@/lib/leaderboard'
import { loadMatchIqInputs, getAllSnapshots } from '@/lib/seasons'
import type { BadgeKey } from '@/lib/badges'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const [playerRes, historyRes, matchesRes, inputs, snapshots] = await Promise.all([
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
    loadMatchIqInputs(),
    getAllSnapshots(),
  ])

  if (playerRes.error) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  // ── Trophy case + all-time standing (shared engine) ──────────────────────
  const { nameById, allMatches } = inputs
  const debutMonth = debutMonthMap(allMatches)

  // All-time standing for this player (rank, avg opp). Always a live replay.
  const allTimeStandings = buildStandings(allMatches, { nameById, debutMonth, month: null })
  const allRow = [...allTimeStandings.mainDraw, ...allTimeStandings.qualifying].find(p => p.id === id) ?? null

  // Per-month badges → trophy case (newest first, only months they earned
  // something). Closed months read their FROZEN snapshot so the trophy case
  // matches the final, announced board; open months recompute live.
  const trophyCase: { month: string; monthLabel: string; rank: number | null; badges: BadgeKey[]; final: boolean }[] = []
  for (const ym of monthsWithMatches(allMatches)) {
    const snap = snapshots[ym]
    const mainDraw = snap
      ? snap.mainDraw
      : buildStandings(allMatches.filter(m => m.played_on.slice(0, 7) === ym), { nameById, debutMonth, month: ym }).mainDraw
    const row = mainDraw.find(p => p.id === id)
    if (row && row.badges.length) {
      trophyCase.push({ month: ym, monthLabel: monthLabel(ym), rank: row.rank, badges: row.badges, final: !!snap })
    }
  }

  // Header rating reflects the all-time REPLAY value (the same number the
  // all-time leaderboard shows), not the incrementally-stored players.rating —
  // the two can drift when matches are approved out of play order. The rating
  // history graph still uses the stored pre/post values (that's its own series).
  const player = allRow ? { ...playerRes.data, rating: allRow.rating } : playerRes.data

  return NextResponse.json({
    player,
    ratingHistory: historyRes.data ?? [],
    matches: matchesRes.data ?? [],
    allTime: allRow ? { rank: allRow.rank, avgOpp: allRow.avgOpp, matches: allRow.matches } : null,
    trophyCase,
  })
}
