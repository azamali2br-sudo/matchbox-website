import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit } from '@/lib/rate-limit'
import {
  computeStandings, generateNextRound, POINTS_OPTIONS,
  MIN_PLAYERS, MAX_PLAYERS, MAX_COURTS, MAX_NAME_LEN, MAX_PLAYER_NAME_LEN,
  type AmericanoPlayer, type AmericanoRound,
} from '@/lib/americano'

export type TournamentRow = {
  id: string
  name: string
  format: 'americano' | 'mexicano'
  points_per_match: number
  courts: number
  played_on: string
  status: 'active' | 'completed'
  players: AmericanoPlayer[]
  rounds: AmericanoRound[]
  organizer_token: string
  is_official: boolean
  is_hidden: boolean
  completed_at: string | null
  created_at: string
}

// Everything the public standings page needs — NEVER the organizer token.
export function publicProjection(t: TournamentRow) {
  return {
    id: t.id,
    name: t.name,
    format: t.format,
    pointsPerMatch: t.points_per_match,
    courts: t.courts,
    playedOn: t.played_on,
    status: t.status,
    players: t.players,
    rounds: t.rounds,
    isOfficial: t.is_official,
    completedAt: t.completed_at,
    standings: computeStandings(t.players, t.rounds),
  }
}

// GET /api/americano?list=official — the curated /leagues feed.
// Unlisted-by-default: ONLY admin-flagged official tournaments appear here;
// everything else is reachable by link only.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get('list') !== 'official') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const { data, error } = await supabaseAdmin
    .from('americano_tournaments')
    .select('*')
    .eq('is_official', true)
    .eq('is_hidden', false)
    .order('played_on', { ascending: false })
    .limit(20)
  // Graceful degradation while the table doesn't exist yet.
  if (error) return NextResponse.json({ tournaments: [] })

  const tournaments = ((data ?? []) as TournamentRow[]).map(t => {
    const standings = computeStandings(t.players, t.rounds)
    const champion = t.status === 'completed' && standings.length > 0 ? standings[0].name : null
    const scored = t.rounds.reduce((n, r) => n + r.matches.filter(m => m.score1 !== null).length, 0)
    return {
      id: t.id, name: t.name, format: t.format, playedOn: t.played_on,
      status: t.status, playerCount: t.players.length, roundCount: t.rounds.length,
      scoredMatches: scored, champion,
    }
  })
  return NextResponse.json({ tournaments })
}

// POST /api/americano — open creation, no account. Rate-limited.
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'americano-create', 5, 60 * 60 * 1000)
  if (limited) return limited

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const format = body.format === 'mexicano' ? 'mexicano' : 'americano'
  const pointsPerMatch = Number(body.pointsPerMatch)
  const courts = Number(body.courts)
  const playedOn = typeof body.playedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.playedOn) ? body.playedOn : null
  const rawPlayers: unknown = body.players

  if (!name || name.length > MAX_NAME_LEN) {
    return NextResponse.json({ error: `Tournament name is required (max ${MAX_NAME_LEN} characters).` }, { status: 400 })
  }
  if (!POINTS_OPTIONS.includes(pointsPerMatch)) {
    return NextResponse.json({ error: 'Invalid points per match.' }, { status: 400 })
  }
  if (!Number.isInteger(courts) || courts < 1 || courts > MAX_COURTS) {
    return NextResponse.json({ error: `Courts must be between 1 and ${MAX_COURTS}.` }, { status: 400 })
  }
  if (!playedOn) return NextResponse.json({ error: 'A valid date is required.' }, { status: 400 })

  if (!Array.isArray(rawPlayers)) return NextResponse.json({ error: 'Players are required.' }, { status: 400 })
  const names = rawPlayers
    .map(p => (typeof p === 'string' ? p.trim().replace(/\s+/g, ' ') : ''))
    .filter(Boolean)
  if (names.length < MIN_PLAYERS || names.length > MAX_PLAYERS) {
    return NextResponse.json({ error: `Between ${MIN_PLAYERS} and ${MAX_PLAYERS} players required.` }, { status: 400 })
  }
  if (names.some(n => n.length > MAX_PLAYER_NAME_LEN)) {
    return NextResponse.json({ error: `Player names are limited to ${MAX_PLAYER_NAME_LEN} characters.` }, { status: 400 })
  }
  const lower = names.map(n => n.toLowerCase())
  if (new Set(lower).size !== lower.length) {
    return NextResponse.json({ error: 'Player names must be unique — add a last initial to tell duplicates apart.' }, { status: 400 })
  }

  const players: AmericanoPlayer[] = names.map((n, i) => ({ id: i, name: n }))
  const organizerToken = randomBytes(24).toString('hex')
  const round1 = generateNextRound(format, players, [], courts, organizerToken)

  const { data, error } = await supabaseAdmin
    .from('americano_tournaments')
    .insert({
      name,
      format,
      points_per_match: pointsPerMatch,
      courts,
      played_on: playedOn,
      players,
      rounds: [round1],
      organizer_token: organizerToken,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ id: data.id, organizerToken })
}
