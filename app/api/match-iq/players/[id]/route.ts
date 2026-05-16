import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  const [playerRes, historyRes, matchesRes] = await Promise.all([
    supabase
      .from('players')
      .select('id, name, rating, wins, losses, created_at')
      .eq('id', id)
      .single(),

    supabase
      .from('rating_history')
      .select('rating, created_at')
      .eq('player_id', id)
      .order('created_at', { ascending: true }),

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
  ])

  if (playerRes.error) return NextResponse.json({ error: 'Player not found' }, { status: 404 })

  return NextResponse.json({
    player: playerRes.data,
    ratingHistory: historyRes.data ?? [],
    matches: matchesRes.data ?? [],
  })
}
