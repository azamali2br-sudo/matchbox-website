import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimit } from '@/lib/rate-limit'
import {
  generateNextRound, isActivePlayer, targetProgress, MAX_ROUNDS, MIN_PLAYERS, MAX_PLAYERS, MAX_PLAYER_NAME_LEN,
  type AmericanoPlayer, type AmericanoRound,
} from '@/lib/americano'
import { publicProjection, type TournamentRow } from '../../../route'

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/
const TOKEN_RE = /^[0-9a-f]{48}$/

async function loadAuthorized(id: string, token: string): Promise<TournamentRow | null> {
  if (!UUID_RE.test(id) || !TOKEN_RE.test(token)) return null
  const { data, error } = await supabaseAdmin
    .from('americano_tournaments')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  const t = data as TournamentRow
  // The token is the auth; a hidden (admin-killed) tournament stays dead
  // even for its organizer.
  if (t.organizer_token !== token || t.is_hidden) return null
  return t
}

// Organizer view — same projection as public (the page adds controls client-side).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; token: string }> }) {
  const { id, token } = await params
  const t = await loadAuthorized(id, token)
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ tournament: publicProjection(t) })
}

// Organizer actions: enter/edit a score, generate the next round, complete.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; token: string }> }) {
  const limited = rateLimit(request, 'americano-manage', 120, 60 * 60 * 1000)
  if (limited) return limited

  const { id, token } = await params
  const t = await loadAuthorized(id, token)
  if (!t) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  if (t.status === 'completed') {
    return NextResponse.json({ error: 'This tournament is completed and locked.' }, { status: 400 })
  }

  const rounds: AmericanoRound[] = t.rounds
  const players: AmericanoPlayer[] = t.players

  if (body.action === 'score') {
    const r = Number(body.round)
    const mIdx = Number(body.match)
    const s1 = Number(body.score1)
    const s2 = Number(body.score2)
    const match = rounds[r]?.matches[mIdx]
    if (!match) return NextResponse.json({ error: 'Unknown match.' }, { status: 400 })
    if (!Number.isInteger(s1) || !Number.isInteger(s2) || s1 < 0 || s2 < 0) {
      return NextResponse.json({ error: 'Scores must be whole numbers.' }, { status: 400 })
    }
    // Points scored can't exceed points played. Under-total is allowed so an
    // abandoned match can still be recorded.
    if (s1 + s2 > t.points_per_match) {
      return NextResponse.json({ error: `Scores add up to more than ${t.points_per_match} points.` }, { status: 400 })
    }
    match.score1 = s1
    match.score2 = s2
  } else if (body.action === 'nextRound') {
    if (rounds.length >= MAX_ROUNDS) {
      return NextResponse.json({ error: `Round limit reached (${MAX_ROUNDS}).` }, { status: 400 })
    }
    if (players.filter(isActivePlayer).length < MIN_PLAYERS) {
      return NextResponse.json({ error: `At least ${MIN_PLAYERS} active players are needed to draw a round.` }, { status: 400 })
    }
    const target = t.target_matches ?? null
    if (target !== null && targetProgress(players, rounds, target).totalNeed === 0) {
      return NextResponse.json({ error: `Everyone has reached ${target} matches — enter any missing scores and mark the tournament completed.` }, { status: 400 })
    }
    rounds.push(generateNextRound(t.format, players, rounds, t.courts, t.organizer_token, target))
  } else if (body.action === 'reshuffle') {
    // Redraw every round that has no score yet with a fresh shuffle — for
    // when the pre-drawn pairings don't match who's actually at the court.
    // Played (scored) rounds are kept verbatim.
    const lastScored = rounds.reduce(
      (last, r, i) => (r.matches.some(m => m.score1 !== null || m.score2 !== null) ? i : last), -1)
    const kept = rounds.slice(0, lastScored + 1)
    const target = t.target_matches ?? null
    const seed = `${t.organizer_token}:${randomBytes(8).toString('hex')}`
    const regen: AmericanoRound[] = [...kept]
    if (t.format === 'americano' && target !== null) {
      while (regen.length < MAX_ROUNDS && targetProgress(players, regen, target).totalNeed > 0) {
        regen.push(generateNextRound(t.format, players, regen, t.courts, seed, target))
      }
    } else {
      for (let i = kept.length; i < rounds.length; i++) {
        regen.push(generateNextRound(t.format, players, regen, t.courts, seed, target))
      }
    }
    if (regen.length === kept.length) {
      return NextResponse.json({ error: 'Nothing to reshuffle — every round already has scores.' }, { status: 400 })
    }
    rounds.splice(0, rounds.length, ...regen)
  } else if (body.action === 'addPlayer') {
    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : ''
    if (!name || name.length > MAX_PLAYER_NAME_LEN) {
      return NextResponse.json({ error: `A name is required (max ${MAX_PLAYER_NAME_LEN} characters).` }, { status: 400 })
    }
    if (players.length >= MAX_PLAYERS) {
      return NextResponse.json({ error: `Player limit reached (${MAX_PLAYERS}).` }, { status: 400 })
    }
    if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json({ error: 'That name is already in the tournament — add a last initial.' }, { status: 400 })
    }
    const nextId = players.reduce((m, p) => Math.max(m, p.id), -1) + 1
    // joinedAtRound credits the rounds they missed, so the newcomer plays
    // in the next draw instead of being benched first.
    players.push({ id: nextId, name, joinedAtRound: rounds.length })
  } else if (body.action === 'setPlayerActive') {
    const pid = Number(body.playerId)
    const active = body.active === true
    const player = players.find(p => p.id === pid)
    if (!player) return NextResponse.json({ error: 'Unknown player.' }, { status: 400 })
    player.active = active
  } else if (body.action === 'complete') {
    const scored = rounds.reduce((n, r) => n + r.matches.filter(m => m.score1 !== null).length, 0)
    if (scored === 0) {
      return NextResponse.json({ error: 'Enter at least one score before completing.' }, { status: 400 })
    }
    // Drop trailing rounds nobody played (pre-drawn schedules that ended
    // early) so the final recap shows only real padel.
    while (rounds.length > 0 && rounds[rounds.length - 1].matches.every(m => m.score1 === null && m.score2 === null)) {
      rounds.pop()
    }
  } else {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 })
  }

  const update: Record<string, unknown> = { rounds, players }
  if (body.action === 'complete') {
    update.status = 'completed'
    update.completed_at = new Date().toISOString()
  }

  const { data, error } = await supabaseAdmin
    .from('americano_tournaments')
    .update(update)
    .eq('id', t.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tournament: publicProjection(data as TournamentRow) })
}
