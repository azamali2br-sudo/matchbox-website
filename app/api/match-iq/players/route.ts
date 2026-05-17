import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

  // Public leaderboard — no phone
  const { data: players, error } = await supabase
    .from('players')
    .select('id, name, rating, wins, losses, created_at')
    .order('rating', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Attach lastPlayedAt: most recent approved match each player appears in.
  // Done client-side after one query rather than N subqueries.
  const ids = (players ?? []).map(p => p.id)
  const lastPlayed: Record<string, string> = {}
  if (ids.length > 0) {
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
  return NextResponse.json({ players: enriched })
}
