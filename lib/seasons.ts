// Match IQ season freeze. A month is "closed" once a row exists for it in
// match_iq_seasons; the stored `standings` is the final, frozen result and is
// served verbatim instead of being recomputed. This is what makes a monthly
// champion / badge safe to announce — a late-approved match (or a future Elo
// tweak) can no longer rewrite a finished season.
//
// All access is via supabaseAdmin (service role) — these run server-side only,
// in routes that already control their output shape.

import { supabaseAdmin } from '@/lib/supabase'
import { buildStandings, debutMonthMap, type MatchRow, type StandingPlayer } from '@/lib/leaderboard'

export type SeasonStandings = {
  mainDraw: StandingPlayer[]
  qualifying: StandingPlayer[]
  totalMatches: number
  totalPlayers: number
}

// Load the two inputs every standings computation needs: id→name map and the
// full approved-match history in play order. Shared so the leaderboard route,
// the profile/trophy route, and the season-close endpoint can never drift.
export async function loadMatchIqInputs(): Promise<{ nameById: Record<string, string>; allMatches: MatchRow[] }> {
  const [{ data: allPlayers }, { data: rawMatches }] = await Promise.all([
    supabaseAdmin.from('players').select('id, name'),
    supabaseAdmin
      .from('matches')
      .select('id, played_on, created_at, team1_p1, team1_p2, team2_p1, team2_p2, team1_score, team2_score')
      .eq('status', 'approved')
      // TRUE play order: the date, then the time-of-day it was actually played
      // (start_time), then approval order only as a last-resort tiebreak. This
      // is the single source of order for every rating (leaderboard, profile,
      // cards, graph, awards) — so entry/approval order never affects ratings.
      .order('played_on', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true }),
  ])
  const nameById: Record<string, string> = {}
  for (const p of allPlayers ?? []) nameById[p.id] = (p.name ?? '').trim()
  return { nameById, allMatches: (rawMatches ?? []) as MatchRow[] }
}

// Build the final standings for one month from the full match history.
export function computeSeasonStandings(
  month: string,
  nameById: Record<string, string>,
  allMatches: MatchRow[],
): SeasonStandings {
  const debutMonth = debutMonthMap(allMatches)
  const monthMatches = allMatches.filter(m => m.played_on.slice(0, 7) === month)
  const { mainDraw, qualifying } = buildStandings(monthMatches, { nameById, debutMonth, month })
  return { mainDraw, qualifying, totalMatches: monthMatches.length, totalPlayers: mainDraw.length + qualifying.length }
}

export async function getClosedMonths(): Promise<Set<string>> {
  const { data } = await supabaseAdmin.from('match_iq_seasons').select('month')
  return new Set((data ?? []).map((r: { month: string }) => r.month))
}

export async function getSeasonSnapshot(month: string): Promise<SeasonStandings | null> {
  const { data } = await supabaseAdmin.from('match_iq_seasons').select('standings').eq('month', month).maybeSingle()
  return (data?.standings as SeasonStandings) ?? null
}

// All frozen snapshots keyed by month — used by the profile route so the trophy
// case reads frozen badges for closed months in a single query.
export async function getAllSnapshots(): Promise<Record<string, SeasonStandings>> {
  const { data } = await supabaseAdmin.from('match_iq_seasons').select('month, standings')
  const out: Record<string, SeasonStandings> = {}
  for (const r of (data ?? []) as { month: string; standings: SeasonStandings }[]) out[r.month] = r.standings
  return out
}
