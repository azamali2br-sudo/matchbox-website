import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { teamRating, calcNewRating, ELO_START, PROVISIONAL_MATCHES } from '@/lib/elo'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone')

  if (phone) {
    // Lookup-by-phone is used during match submission to find an existing
    // player. Return only id+name (never echo phone, rating, or W/L) so this
    // endpoint can't be enumerated to harvest profiles.
    const { data, error } = await supabase
      .from('players')
      .select('id, name')
      .eq('phone', phone)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ player: data })
  }

  const window = searchParams.get('window') // '7d' | '30d' | null/undefined = all-time
  const windowDays = window === '7d' ? 7 : window === '30d' ? 30 : null

  // ---------- ALL-TIME PATH (default) ----------
  if (windowDays === null) {
    const { data: players, error } = await supabase
      .from('players')
      .select('id, name, rating, wins, losses, created_at')
      .order('rating', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const lastPlayed: Record<string, string> = {}
    if ((players ?? []).length > 0) {
      const { data: matches } = await supabase
        .from('matches')
        .select('played_on, team1_p1, team1_p2, team2_p1, team2_p2')
        .eq('status', 'approved')
        .order('played_on', { ascending: false })
      for (const m of matches ?? []) {
        for (const slot of ['team1_p1', 'team1_p2', 'team2_p1', 'team2_p2'] as const) {
          const pid = m[slot] as string | null
          if (pid && !lastPlayed[pid]) lastPlayed[pid] = m.played_on as string
        }
      }
    }

    const enriched = (players ?? []).map(p => ({
      ...p,
      lastPlayedAt: lastPlayed[p.id] ?? null,
      lifetimeMatches: (p.wins ?? 0) + (p.losses ?? 0),
      rankChange: null as number | null,
    }))
    return NextResponse.json({ players: enriched, window: 'all' })
  }

  // ---------- WINDOW PATH (7d / 30d) ----------
  // Recompute Elo from scratch using only matches inside the window.
  // Everyone starts at ELO_START. This gives a "tournament performance"
  // rating that reflects the player's form over that window only.
  type MatchRow = {
    id: string
    played_on: string
    team1_p1: string; team1_p2: string
    team2_p1: string; team2_p2: string
    team1_score: number; team2_score: number
  }
  type Stats = {
    rating: number; wins: number; losses: number; matches: number; lastPlayedAt: string | null
  }

  function simulate(matches: MatchRow[]): Record<string, Stats> {
    const state: Record<string, Stats> = {}
    const ensure = (id: string) => {
      if (!state[id]) state[id] = { rating: ELO_START, wins: 0, losses: 0, matches: 0, lastPlayedAt: null }
      return state[id]
    }
    for (const m of matches) {
      const t1p1 = ensure(m.team1_p1), t1p2 = ensure(m.team1_p2)
      const t2p1 = ensure(m.team2_p1), t2p2 = ensure(m.team2_p2)
      const t1R = teamRating(t1p1.rating, t1p2.rating)
      const t2R = teamRating(t2p1.rating, t2p2.rating)
      const team1Won = m.team1_score > m.team2_score
      t1p1.rating = calcNewRating(t1p1.rating, team1Won, t1R, t2R, t1p1.matches)
      t1p2.rating = calcNewRating(t1p2.rating, team1Won, t1R, t2R, t1p2.matches)
      t2p1.rating = calcNewRating(t2p1.rating, !team1Won, t2R, t1R, t2p1.matches)
      t2p2.rating = calcNewRating(t2p2.rating, !team1Won, t2R, t1R, t2p2.matches)
      for (const s of [t1p1, t1p2]) {
        s.matches++; s.lastPlayedAt = m.played_on
        if (team1Won) s.wins++; else s.losses++
      }
      for (const s of [t2p1, t2p2]) {
        s.matches++; s.lastPlayedAt = m.played_on
        if (!team1Won) s.wins++; else s.losses++
      }
    }
    return state
  }

  const dayStr = (n: number) =>
    new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Fetch enough history to cover both the current window AND the previous
  // window of the same length (for rank-change arrows).
  const currentCutoff = dayStr(windowDays)
  const prevCutoff = dayStr(windowDays * 2)

  const [{ data: allPlayers }, { data: allMatches }] = await Promise.all([
    supabase.from('players').select('id, name, created_at, wins, losses'),
    supabase
      .from('matches')
      .select('id, played_on, created_at, team1_p1, team1_p2, team2_p1, team2_p2, team1_score, team2_score')
      .eq('status', 'approved')
      .gte('played_on', prevCutoff)
      .order('played_on', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  const allMatchesTyped = (allMatches ?? []) as MatchRow[]
  const currentMatches = allMatchesTyped.filter(m => m.played_on >= currentCutoff)
  const prevMatches = allMatchesTyped.filter(m => m.played_on < currentCutoff)

  const currentState = simulate(currentMatches)
  const prevState = simulate(prevMatches)

  // Rank players within each period — only those who played count.
  // Frontend will filter further by lifetimeMatches >= PROVISIONAL_MATCHES,
  // but for arrow comparison we rank everyone who played in each period
  // (otherwise a player going from "ranked" to "unranked" has no signal).
  const lifetimeMatchesById: Record<string, number> = {}
  for (const p of allPlayers ?? []) {
    lifetimeMatchesById[p.id] = (p.wins ?? 0) + (p.losses ?? 0)
  }

  // Tie-break must match the final API sort below or display rank and
  // computed rankChange disagree for tied players.
  function tieBreak(idA: string, a: Stats, idB: string, b: Stats): number {
    if (b.rating !== a.rating) return b.rating - a.rating
    if (b.wins !== a.wins) return b.wins - a.wins
    return idA.localeCompare(idB)
  }

  function rankMap(state: Record<string, Stats>): Record<string, number> {
    const ranked = Object.entries(state)
      .filter(([id]) => (lifetimeMatchesById[id] ?? 0) >= PROVISIONAL_MATCHES)
      .sort(([idA, a], [idB, b]) => tieBreak(idA, a, idB, b))
    const ranks: Record<string, number> = {}
    ranked.forEach(([id], i) => { ranks[id] = i + 1 })
    return ranks
  }

  const currentRanks = rankMap(currentState)
  const prevRanks = rankMap(prevState)

  const players = (allPlayers ?? [])
    .filter(p => currentState[p.id])
    .map(p => {
      const s = currentState[p.id]
      const curRank = currentRanks[p.id] ?? null
      const prevRank = prevRanks[p.id] ?? null
      // rankChange: positive = moved UP (good). null = no comparison available
      // (wasn't ranked in previous period, e.g. new this week).
      const rankChange =
        curRank !== null && prevRank !== null ? prevRank - curRank : null
      return {
        id: p.id,
        name: p.name,
        created_at: p.created_at,
        rating: s.rating,
        wins: s.wins,
        losses: s.losses,
        lastPlayedAt: s.lastPlayedAt,
        lifetimeMatches: lifetimeMatchesById[p.id] ?? 0,
        rankChange,
      }
    })
    // Same tie-break as rankMap above so display rank matches computed rank
    .sort((a, b) => tieBreak(a.id, currentState[a.id], b.id, currentState[b.id]))

  return NextResponse.json({ players, window })
}
