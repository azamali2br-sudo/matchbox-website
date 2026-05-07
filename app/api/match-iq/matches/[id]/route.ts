import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { teamRating, calcNewRating } from '@/lib/elo'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { action } = await request.json()

  if (action === 'reject') {
    const { error } = await supabaseAdmin.from('matches').update({ status: 'rejected' }).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (action !== 'approve') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  // Fetch match with current player ratings
  const { data: match, error: matchErr } = await supabaseAdmin
    .from('matches')
    .select(`
      *,
      p1:players!team1_p1(id, rating),
      p2:players!team1_p2(id, rating),
      p3:players!team2_p1(id, rating),
      p4:players!team2_p2(id, rating)
    `)
    .eq('id', id)
    .single()

  if (matchErr || !match) return NextResponse.json({ error: 'Match not found' }, { status: 404 })
  if (match.status === 'approved') return NextResponse.json({ error: 'Already approved' }, { status: 400 })

  type PlayerRow = { id: string; rating: number }
  const p1 = match.p1 as PlayerRow
  const p2 = match.p2 as PlayerRow
  const p3 = match.p3 as PlayerRow
  const p4 = match.p4 as PlayerRow

  const team1Won = match.team1_score > match.team2_score
  const t1Rating = teamRating(p1.rating, p2.rating)
  const t2Rating = teamRating(p3.rating, p4.rating)

  const newRatings = {
    [p1.id]: calcNewRating(p1.rating, team1Won, t1Rating, t2Rating),
    [p2.id]: calcNewRating(p2.rating, team1Won, t1Rating, t2Rating),
    [p3.id]: calcNewRating(p3.rating, !team1Won, t2Rating, t1Rating),
    [p4.id]: calcNewRating(p4.rating, !team1Won, t2Rating, t1Rating),
  }

  // Update each player's rating, wins, losses
  for (const [pid, newRating] of Object.entries(newRatings)) {
    const won = team1Won ? [p1.id, p2.id].includes(pid) : [p3.id, p4.id].includes(pid)
    await supabaseAdmin
      .from('players')
      .update({
        rating: newRating,
        wins: won ? { increment: 1 } : undefined,
        losses: !won ? { increment: 1 } : undefined,
      })
      .eq('id', pid)
  }

  // Re-fetch updated players for wins/losses increment (Supabase doesn't support increment via update directly)
  const playerIds = [p1.id, p2.id, p3.id, p4.id]
  const { data: currentPlayers } = await supabaseAdmin
    .from('players')
    .select('id, wins, losses, rating')
    .in('id', playerIds)

  for (const player of currentPlayers ?? []) {
    const won = team1Won ? [p1.id, p2.id].includes(player.id) : [p3.id, p4.id].includes(player.id)
    await supabaseAdmin
      .from('players')
      .update({
        rating: newRatings[player.id],
        wins: won ? player.wins + 1 : player.wins,
        losses: !won ? player.losses + 1 : player.losses,
      })
      .eq('id', player.id)
  }

  // Insert rating history for all 4 players
  const historyRows = [p1, p2, p3, p4].map(p => ({
    player_id: p.id,
    rating: newRatings[p.id],
    match_id: id,
  }))
  await supabaseAdmin.from('rating_history').insert(historyRows)

  // Mark match approved
  await supabaseAdmin.from('matches').update({ status: 'approved' }).eq('id', id)

  return NextResponse.json({ success: true, newRatings })
}
