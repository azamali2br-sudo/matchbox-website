import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { teamRating, calcNewRating, ELO_START } from '@/lib/elo'

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

    const enriched = (players ?? []).map(p => ({ ...p, lastPlayedAt: lastPlayed[p.id] ?? null }))
    return NextResponse.json({ players: enriched, window: 'all' })
  }

  // ---------- WINDOW PATH (7d / 30d) ----------
  // Recompute Elo from scratch using only matches inside the window.
  // Everyone starts at ELO_START. This gives a "tournament performance"
  // rating that reflects the player's form over that window only.
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const [{ data: allPlayers }, { data: windowMatches }] = await Promise.all([
    supabase.from('players').select('id, name, created_at'),
    supabase
      .from('matches')
      .select('id, played_on, created_at, team1_p1, team1_p2, team2_p1, team2_p2, team1_score, team2_score')
      .eq('status', 'approved')
      .gte('played_on', cutoff)
      .order('played_on', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  type Stats = {
    rating: number
    wins: number
    losses: number
    matches: number
    lastPlayedAt: string | null
  }
  const state: Record<string, Stats> = {}
  const ensure = (id: string) => {
    if (!state[id]) state[id] = { rating: ELO_START, wins: 0, losses: 0, matches: 0, lastPlayedAt: null }
    return state[id]
  }

  for (const m of windowMatches ?? []) {
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

  // Return only players who actually played in the window
  const players = (allPlayers ?? [])
    .filter(p => state[p.id])
    .map(p => ({
      id: p.id,
      name: p.name,
      created_at: p.created_at,
      rating: state[p.id].rating,
      wins: state[p.id].wins,
      losses: state[p.id].losses,
      lastPlayedAt: state[p.id].lastPlayedAt,
    }))
    .sort((a, b) => b.rating - a.rating)

  return NextResponse.json({ players, window })
}
