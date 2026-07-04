import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import type { TournamentRow } from '../../americano/route'

// Admin: every tournament (including hidden), newest first — the curation list.
export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (guard) return guard

  const { data, error } = await supabaseAdmin
    .from('americano_tournaments')
    .select('id, name, format, played_on, status, players, rounds, is_official, is_hidden, created_at')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ tournaments: [], error: error.message })

  const tournaments = ((data ?? []) as TournamentRow[]).map(t => ({
    id: t.id,
    name: t.name,
    format: t.format,
    playedOn: t.played_on,
    status: t.status,
    playerCount: t.players.length,
    roundCount: t.rounds.length,
    isOfficial: t.is_official,
    isHidden: t.is_hidden,
    createdAt: t.created_at,
  }))
  return NextResponse.json({ tournaments })
}
