import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/admin-auth'
import { getCurrentAccountId } from '@/lib/account-auth'
import { rateLimit } from '@/lib/rate-limit'
import { titleCaseName } from '@/lib/format'
import { getClosedMonths, loadMatchIqInputs } from '@/lib/seasons'
import { monthLabel, replaySeason } from '@/lib/leaderboard'
import { validateSetScores } from '@/lib/set-scores'

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
  const dateParam = searchParams.get('date') // 'YYYY-MM-DD' → scope to that exact day

  if (status !== 'approved') {
    const guard = await requireAdmin(request)
    if (guard) return guard
  }

  // A day filter implies its calendar month for the ratings replay, so the
  // pre-match numbers on date-filtered cards match the Monthly Cup board.
  const dayFilter = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null
  const monthKey = dayFilter ? dayFilter.slice(0, 7) : month && /^\d{4}-\d{2}$/.test(month) ? month : null

  // Calendar-month bounds (played_on is a date).
  let monthStart: string | null = null
  let nextMonthStart: string | null = null
  if (monthKey) {
    const [y, mo] = monthKey.split('-').map(Number)
    monthStart = `${monthKey}-01`
    nextMonthStart = mo === 12 ? `${y + 1}-01-01` : `${y}-${String(mo + 1).padStart(2, '0')}-01`
  }

  const listQ = supabaseAdmin.from('matches').select(MATCH_SELECT).eq('status', status)
  const countQ = supabaseAdmin.from('matches').select('id', { count: 'exact', head: true }).eq('status', status)
  if (dayFilter) {
    listQ.eq('played_on', dayFilter)
    countQ.eq('played_on', dayFilter)
  } else if (monthStart && nextMonthStart) {
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
  // Approval-queue duplicate guard: flag a pending match when another match
  // (pending or approved) already involves the same four players on the same
  // date — the observed failure mode is the same match entered twice.
  const duplicateNotes: Record<string, string> = {}
  if (status === 'pending' && matches.length > 0) {
    type DupRow = {
      id: string; played_on: string; start_time: string | null; status: string
      team1_p1: string; team1_p2: string; team2_p1: string; team2_p2: string
      team1_score: number; team2_score: number
    }
    const dates = [...new Set(matches.map((m: { played_on: string }) => m.played_on))]
    const { data: sameDay } = await supabaseAdmin
      .from('matches')
      .select('id, played_on, start_time, status, team1_p1, team1_p2, team2_p1, team2_p2, team1_score, team2_score')
      .in('played_on', dates)
      .in('status', ['pending', 'approved'])
    const playerKey = (ids: string[], date: string) => [...ids].sort().join('|') + '@' + date
    const byKey = new Map<string, DupRow[]>()
    for (const r of (sameDay ?? []) as DupRow[]) {
      const k = playerKey([r.team1_p1, r.team1_p2, r.team2_p1, r.team2_p2], r.played_on)
      byKey.set(k, [...(byKey.get(k) ?? []), r])
    }
    for (const m of matches as unknown as { id: string; played_on: string; p1: { id: string }; p2: { id: string }; p3: { id: string }; p4: { id: string } }[]) {
      const k = playerKey([m.p1.id, m.p2.id, m.p3.id, m.p4.id], m.played_on)
      const twin = (byKey.get(k) ?? []).find(r => r.id !== m.id)
      if (twin) {
        const when = twin.start_time ? ` at ${twin.start_time}` : ''
        duplicateNotes[m.id] =
          `these four players already have a ${twin.status} ${twin.team1_score}–${twin.team2_score} match on this date${when}`
      }
    }
  }

  const matchesWithSubmitter = matches.map((m: { id: string; submitted_by: string | null }) => ({
    ...m,
    submitted_by_name: (m.submitted_by && submitterNames[m.submitted_by]) || null,
    duplicate_note: duplicateNotes[m.id] ?? null,
  }))

  return NextResponse.json({ matches: matchesWithSubmitter, matchRatings, total: count ?? 0 })
}

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'match-submit', 10, 60 * 60 * 1000)
  if (limited) return limited

  // Submitter identity comes from the session, never the request body — a
  // logged-in account (normal path) or the admin session (manual entry). No
  // session at all → no submission.
  let submitter = await getCurrentAccountId()
  if (!submitter) {
    const adminGuard = await requireAdmin(request)
    if (adminGuard) {
      return NextResponse.json({ error: 'Please log in to submit a match.' }, { status: 401 })
    }
    submitter = 'admin'
  }

  const body = await request.json()
  const { playedOn, court, startTime, team1, team2, team1Score, team2Score, setScores } = body

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
  // Set scores are optional, but when given they must be real finished sets
  // (a 5–3 set can't be submitted) and agree with the sets score.
  if (setScores != null) {
    if (!Array.isArray(setScores)) {
      return NextResponse.json({ error: 'Invalid set scores' }, { status: 400 })
    }
    const parsedSets = setScores.map((x: { t1?: unknown; t2?: unknown }) => ({ t1: Number(x?.t1), t2: Number(x?.t2) }))
    const setErr = validateSetScores(parsedSets, s1, s2)
    if (setErr) return NextResponse.json({ error: setErr }, { status: 400 })
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
      submitted_by: submitter,
    })
    .select(MATCH_SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ match: data })
}
