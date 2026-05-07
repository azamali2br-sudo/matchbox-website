import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const MATCH_SELECT = `
  id, played_on, court, start_time, team1_score, team2_score, set_scores, status, submitted_by, created_at,
  p1:players!team1_p1(id, name, rating),
  p2:players!team1_p2(id, name, rating),
  p3:players!team2_p1(id, name, rating),
  p4:players!team2_p2(id, name, rating)
`

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') ?? 'approved'
  const limit = parseInt(searchParams.get('limit') ?? '20')

  const [{ data, error }, { count }] = await Promise.all([
    supabaseAdmin
      .from('matches')
      .select(MATCH_SELECT)
      .eq('status', status)
      .order('played_on', { ascending: false })
      .limit(limit),
    supabaseAdmin
      .from('matches')
      .select('id', { count: 'exact', head: true })
      .eq('status', status),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const matches = data ?? []

  // For approved matches, attach ratings at time of match from rating_history
  let matchRatings: Record<string, Record<string, number>> = {}
  if (status === 'approved' && matches.length > 0) {
    const matchIds = matches.map((m: { id: string }) => m.id)
    const { data: historyRows } = await supabaseAdmin
      .from('rating_history')
      .select('match_id, player_id, rating')
      .in('match_id', matchIds)

    for (const row of historyRows ?? []) {
      if (!matchRatings[row.match_id]) matchRatings[row.match_id] = {}
      matchRatings[row.match_id][row.player_id] = row.rating
    }
  }

  return NextResponse.json({ matches, matchRatings, total: count ?? 0 })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { playedOn, court, startTime, team1, team2, team1Score, team2Score, setScores, submittedBy } = body

  if (!playedOn || !team1?.[0] || !team1?.[1] || !team2?.[0] || !team2?.[1]) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (team1Score == null || team2Score == null) {
    return NextResponse.json({ error: 'Scores required' }, { status: 400 })
  }

  const playerIds: string[] = []
  for (const p of [...team1, ...team2]) {
    const { data: existing } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('phone', p.phone)
      .maybeSingle()

    if (existing) {
      playerIds.push(existing.id)
    } else {
      const { data: created, error } = await supabaseAdmin
        .from('players')
        .insert({ name: p.name, phone: p.phone })
        .select('id')
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      playerIds.push(created.id)
    }
  }

  const [t1p1, t1p2, t2p1, t2p2] = playerIds
  const { data, error } = await supabaseAdmin
    .from('matches')
    .insert({
      played_on: playedOn,
      court: court ?? null,
      start_time: startTime ?? null,
      team1_p1: t1p1,
      team1_p2: t1p2,
      team2_p1: t2p1,
      team2_p2: t2p2,
      team1_score: team1Score,
      team2_score: team2Score,
      set_scores: setScores ?? null,
      submitted_by: submittedBy || 'unknown',
    })
    .select(MATCH_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ match: data })
}
