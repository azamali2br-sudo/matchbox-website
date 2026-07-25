import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import {
  buildStandings, debutMonthMap, monthsWithMatches, monthLabel,
  replaySeason, awardMatchIds, enrichMatches, playerRatingSeries, type AwardMatch,
} from '@/lib/leaderboard'
import { loadMatchIqInputs, getAllSnapshots } from '@/lib/seasons'
import type { BadgeKey } from '@/lib/badges'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const [playerRes, matchesRes, inputs, snapshots] = await Promise.all([
    supabase.from('players').select('id, name, rating, wins, losses, created_at').eq('id', id).single(),
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

  // Rating graph = the player's rating after each match, in true play order,
  // from the replay (matches the header/leaderboard). created_at carries the
  // play date so the existing graph keeps working.
  const ratingHistory = playerRatingSeries(allMatches, id).map(s => ({ rating: s.rating, created_at: s.playedOn }))

  // Per-month badges → trophy case (newest first, only months they earned
  // something). Closed months read their FROZEN snapshot so the trophy case
  // matches the final, announced board; open months recompute live. When the
  // player won Giant Slayer that month, attach the upset match for context.
  const trophyCase: {
    month: string; monthLabel: string; rank: number | null; rating: number | null; badges: BadgeKey[]
    final: boolean; slayerMatch: AwardMatch | null
  }[] = []
  for (const ym of monthsWithMatches(allMatches)) {
    const snap = snapshots[ym]
    const monthMatches = allMatches.filter(m => m.played_on.slice(0, 7) === ym)
    const draws = snap ?? buildStandings(monthMatches, { nameById, debutMonth, month: ym })
    const row = [...draws.mainDraw, ...draws.qualifying].find(p => p.id === id)
    if (row && row.badges.length) {
      let slayerMatch: AwardMatch | null = null
      if (row.badges.includes('slayer')) {
        const { log, upsetMatchByPlayer } = replaySeason(monthMatches)
        slayerMatch = enrichMatches(awardMatchIds('slayer', id, monthMatches, upsetMatchByPlayer), log, nameById)[0] ?? null
      }
      trophyCase.push({ month: ym, monthLabel: monthLabel(ym), rank: row.rank, rating: Math.round(row.rating), badges: row.badges, final: !!snap, slayerMatch })
    }
  }

  // Header rating reflects the all-time REPLAY value (the same number the
  // all-time leaderboard shows), not the incrementally-stored players.rating —
  // the two can drift when matches are approved out of play order. The rating
  // history graph still uses the stored pre/post values (that's its own series).
  const player = allRow ? { ...playerRes.data, rating: allRow.rating } : playerRes.data

  return NextResponse.json({
    player,
    ratingHistory,
    matches: matchesRes.data ?? [],
    allTime: allRow ? { rank: allRow.rank, avgOpp: allRow.avgOpp, matches: allRow.matches } : null,
    trophyCase,
  })
}
