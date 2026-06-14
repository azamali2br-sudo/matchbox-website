import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { rateLimit } from '@/lib/rate-limit'
import { titleCaseName } from '@/lib/format'
import { getClosedMonths, loadMatchIqInputs } from '@/lib/seasons'
import { monthLabel, replaySeason } from '@/lib/leaderboard'

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

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
  const month = searchParams.get('month') // 'YYYY-MM' → scope to that calendar month

  if (status !== 'approved') {
    const guard = await requireAdmin(request)
    if (guard) return guard
  }

  // Calendar-month bounds for an optional month filter (played_on is a date).
  let monthStart: string | null = null
  let nextMonthStart: string | null = null
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, mo] = month.split('-').map(Number)
    monthStart = `${month}-01`
    nextMonthStart = mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, '0')}-01`
  }

  const listQ = supabaseAdmin.from('matches').select(MATCH_SELECT).eq('status', status)
  const countQ = supabaseAdmin.from('matches').select('id', { count: 'exact', head: true }).eq('status', status)
  if (monthStart && nextMonthStart) {
    listQ.gte('played_on', monthStart).lt('played_on', nextMonthStart)
    countQ.gte('played_on', monthStart).lt('played_on', nextMonthStart)
  }

  const [{ data, error }, { count }] = await Promise.all([
    // Newest first by actual play time (date → start_time → entry), matching the
    // play order the ratings use.
    listQ
      .order('played_on', { ascending: false })
      .order('start_time', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit),
    countQ,
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const matches = data ?? []

  // Attach each player's pre-match rating from the REPLAY (true play order), not
  // from rating_history (which is in approval order and shows the wrong number
  // when matches are approved out of sequence). This keeps the cards consistent
  // with the leaderboard/profile ratings.
  const matchRatings: Record<string, Record<string, number>> = {}
  if (status === 'approved' && matches.length > 0) {
    const { allMatches } = await loadMatchIqInputs()
    const windowMatches = monthStart && nextMonthStart
      ? allMatches.filter(m => m.played_on >= monthStart! && m.played_on < nextMonthStart!)
      : allMatches
    const { log } = replaySeason(windowMatches)
    for (const m of matches as { id: string }[]) {
      const snap = log.get(m.id)
      if (!snap) continue
      matchRatings[m.id] = {}
      for (const p of [...snap.team1, ...snap.team2]) matchRatings[m.id][p.id] = p.pre
    }
  }

  // Resolve "submitted by" (stored as the submitter's account id) → a display
  // name, so the admin approval view shows who sent it instead of a raw id.
  const submitterIds = [
    ...new Set(
      matches
        .map((m: { submitted_by: string | null }) => m.submitted_by)
        .filter((v: string | null): v is string => !!v && UUID_RE.test(v)),
    ),
  ]
  const submitterNames: Record<string, string> = {}
  if (submitterIds.length > 0) {
    const { data: accts } = await supabaseAdmin
      .from('accounts')
      .select('id, name')
      .in('id', submitterIds)
    for (const a of accts ?? []) submitterNames[a.id] = a.name
  }
  const matchesWithSubmitter = matches.map((m: { submitted_by: string | null }) => ({
    ...m,
    submitted_by_name: (m.submitted_by && submitterNames[m.submitted_by]) || null,
  }))

  return NextResponse.json({ matches: matchesWithSubmitter, matchRatings, total: count ?? 0 })
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'match-submit', 10, 60 * 60 * 1000)
  if (limited) return limited

  const body = await request.json()
  const { playedOn, court, startTime, team1, team2, team1Score, team2Score, setScores, submittedBy } = body

  // team1 / team2 are arrays of two ACCOUNT ids picked from the name search.
  if (!playedOn || !Array.isArray(team1) || !Array.isArray(team2) || team1.length !== 2 || team2.length !== 2) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // A finished (closed) season is frozen — no new matches can be added to it.
  const playedMonth = String(playedOn).slice(0, 7)
  if ((await getClosedMonths()).has(playedMonth)) {
    return NextResponse.json({ error: `${monthLabel(playedMonth)} is closed — matches can no longer be submitted for a finished season.` }, { status: 400 })
  }
  if (team1Score == null || team2Score == null) {
    return NextResponse.json({ error: 'Scores required' }, { status: 400 })
  }
  const s1 = Number(team1Score), s2 = Number(team2Score)
  if (!Number.isInteger(s1) || !Number.isInteger(s2) || s1 < 0 || s2 < 0 || s1 > 3 || s2 > 3) {
    return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
  }
  if (s1 === s2) {
    return NextResponse.json({ error: 'Match cannot end in a tie' }, { status: 400 })
  }

  const accountIds: string[] = [...team1, ...team2]
  if (accountIds.some(id => typeof id !== 'string' || !UUID_RE.test(id))) {
    return NextResponse.json({ error: 'Invalid player selection' }, { status: 400 })
  }
  if (new Set(accountIds).size !== 4) {
    return NextResponse.json({ error: 'A player can only appear once' }, { status: 400 })
  }

  // Resolve each picked account → a Match IQ player. Only registered accounts
  // are accepted (no on-the-fly player creation from arbitrary input). A player
  // row is created from the account on their first-ever match, keyed by phone.
  const playerIds: string[] = []
  for (const accountId of accountIds) {
    const { data: account } = await supabaseAdmin
      .from('accounts')
      .select('id, name, phone')
      .eq('id', accountId)
      .maybeSingle()
    if (!account) {
      return NextResponse.json({ error: 'One of the selected players is not registered.' }, { status: 400 })
    }

    const { data: existing } = await supabaseAdmin
      .from('players')
      .select('id')
      .eq('phone', account.phone)
      .maybeSingle()

    if (existing) {
      playerIds.push(existing.id)
    } else {
      const { data: created, error } = await supabaseAdmin
        .from('players')
        .insert({ name: titleCaseName(account.name), phone: account.phone })
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
