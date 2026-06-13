// Shared Match IQ standings + badge engine. Used by the leaderboard API (one
// window) and the profile API (every month, to build a trophy case) so the
// rating replay and badge rules live in exactly one place.

import { teamRating, calcNewRating, ELO_START } from '@/lib/elo'
import type { BadgeKey } from '@/lib/badges'

// Matches a player needs IN THE WINDOW to be officially ranked (Main Draw);
// fewer = Qualifying (visible, unranked). Kept at 3 for beta-scale volume —
// raising it now would empty the board. Bump to 5 once a typical month has
// ~30+ matches so a ranked spot means a real sample.
export const MAIN_DRAW_MIN = 3
const STREAK_MIN = 3             // wins in a row → Hot Streak
const SLAYER_MIN = 12            // opponent strength gap → Giant Slayer

export type MatchRow = {
  id: string; played_on: string; created_at: string
  team1_p1: string; team1_p2: string; team2_p1: string; team2_p2: string
  team1_score: number; team2_score: number
}

type Stats = {
  rating: number; wins: number; losses: number; matches: number
  oppSum: number; curStreak: number; maxStreak: number; bestUpset: number; lastPlayedAt: string | null
}

export type StandingPlayer = {
  id: string; name: string; rating: number
  wins: number; losses: number; matches: number
  // maxStreak = longest run in the window (drives the month-end "Wildfire" award).
  // currentStreak = live run as of their last match (drives the live "Hot Streak"
  // indicator; resets to 0 on a loss).
  winRate: number | null; avgOpp: number | null; maxStreak: number; currentStreak: number
  rank: number | null; badges: BadgeKey[]
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function simulate(matches: MatchRow[]): Record<string, Stats> {
  const state: Record<string, Stats> = {}
  const ensure = (id: string) => (state[id] ??= {
    rating: ELO_START, wins: 0, losses: 0, matches: 0,
    oppSum: 0, curStreak: 0, maxStreak: 0, bestUpset: -Infinity, lastPlayedAt: null,
  })
  for (const m of matches) {
    const t1 = [ensure(m.team1_p1), ensure(m.team1_p2)]
    const t2 = [ensure(m.team2_p1), ensure(m.team2_p2)]
    const t1R = teamRating(t1[0].rating, t1[1].rating)
    const t2R = teamRating(t2[0].rating, t2[1].rating)
    const t1won = m.team1_score > m.team2_score
    const apply = (team: Stats[], myR: number, oppR: number, won: boolean) => {
      for (const p of team) {
        p.rating = calcNewRating(p.rating, won, myR, oppR, p.matches)
        p.matches++; p.oppSum += oppR; p.lastPlayedAt = m.played_on
        if (won) {
          p.wins++; p.curStreak++; p.maxStreak = Math.max(p.maxStreak, p.curStreak)
          if (oppR - myR > p.bestUpset) p.bestUpset = oppR - myR
        } else { p.losses++; p.curStreak = 0 }
      }
    }
    apply(t1, t1R, t2R, t1won)
    apply(t2, t2R, t1R, !t1won)
  }
  return state
}

export function buildStandings(
  matches: MatchRow[],
  opts: { nameById: Record<string, string>; debutMonth: Record<string, string>; month: string | null },
): { mainDraw: StandingPlayer[]; qualifying: StandingPlayer[] } {
  const state = simulate(matches)
  const all: StandingPlayer[] = Object.entries(state).map(([id, s]) => ({
    id, name: opts.nameById[id] ?? 'Unknown', rating: s.rating,
    wins: s.wins, losses: s.losses, matches: s.matches,
    winRate: s.matches > 0 ? Math.round((s.wins / s.matches) * 100) : null,
    avgOpp: s.matches > 0 ? Math.round(s.oppSum / s.matches) : null,
    maxStreak: s.maxStreak, currentStreak: s.curStreak, rank: null, badges: [],
  }))

  const byRating = (a: StandingPlayer, b: StandingPlayer) =>
    b.rating - a.rating || b.wins - a.wins || b.matches - a.matches || (b.avgOpp ?? 0) - (a.avgOpp ?? 0) || a.name.localeCompare(b.name)

  const mainDraw = all.filter(p => p.matches >= MAIN_DRAW_MIN).sort(byRating)
  const qualifying = all.filter(p => p.matches < MAIN_DRAW_MIN).sort(byRating)
  mainDraw.forEach((p, i) => { p.rank = i + 1 })

  const give = (p: StandingPlayer | undefined, key: BadgeKey) => { if (p) p.badges.push(key) }
  give(mainDraw[0], 'champion')
  give(mainDraw[1], 'challenger')
  give(mainDraw[2], 'contender')

  const maxMatches = Math.max(0, ...mainDraw.map(p => p.matches))
  if (maxMatches >= MAIN_DRAW_MIN) mainDraw.filter(p => p.matches === maxMatches).forEach(p => give(p, 'ironman'))

  mainDraw.filter(p => p.losses === 0).forEach(p => give(p, 'perfect'))

  const maxStreak = Math.max(0, ...mainDraw.map(p => p.maxStreak))
  if (maxStreak >= STREAK_MIN) mainDraw.filter(p => p.maxStreak === maxStreak).forEach(p => give(p, 'streak'))

  const upsets = mainDraw.map(p => ({ p, up: state[p.id].bestUpset }))
  const maxUpset = Math.max(-Infinity, ...upsets.map(u => u.up))
  if (maxUpset >= SLAYER_MIN) upsets.filter(u => u.up === maxUpset).forEach(u => give(u.p, 'slayer'))

  // Rookie — best-ranked player whose debut is this month, once veterans exist.
  if (opts.month) {
    const hasVeterans = mainDraw.some(p => opts.debutMonth[p.id] !== opts.month)
    if (hasVeterans) give(mainDraw.find(p => opts.debutMonth[p.id] === opts.month), 'rookie')
  }

  return { mainDraw, qualifying }
}

// Helpers shared by both routes.
export function debutMonthMap(allMatches: MatchRow[]): Record<string, string> {
  const debut: Record<string, string> = {}
  for (const m of allMatches) {
    for (const id of [m.team1_p1, m.team1_p2, m.team2_p1, m.team2_p2]) {
      if (!debut[id]) debut[id] = m.played_on.slice(0, 7)
    }
  }
  return debut
}

export function monthsWithMatches(allMatches: MatchRow[]): string[] {
  return [...new Set(allMatches.map(m => m.played_on.slice(0, 7)))].sort().reverse()
}
