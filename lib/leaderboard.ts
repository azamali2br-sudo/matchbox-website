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
const STREAK_MIN = 3             // wins in a row → Wildfire award
const SLAYER_MIN = 12            // opponent strength gap → Giant Slayer

export type MatchRow = {
  id: string; played_on: string; created_at: string
  team1_p1: string; team1_p2: string; team2_p1: string; team2_p2: string
  team1_score: number; team2_score: number
}

type Stats = {
  rating: number; wins: number; losses: number; matches: number
  oppSum: number; curStreak: number; maxStreak: number
  bestUpset: number; bestUpsetMatchId: string | null; lastPlayedAt: string | null
}

export type StandingPlayer = {
  id: string; name: string; rating: number
  wins: number; losses: number; matches: number
  // maxStreak = longest run in the window (drives the month-end "Wildfire" award).
  // currentStreak = live run as of their last match (drives the live "Hot Streak"
  // indicator; resets to 0 on a loss).
  winRate: number | null; avgOpp: number | null; maxStreak: number; currentStreak: number
  // Date (YYYY-MM-DD) of their most recent match in the window — drives the
  // Active/Dormant split on the all-time skill board.
  lastPlayedAt: string | null
  rank: number | null; badges: BadgeKey[]
}

// Snapshot of one match from the replay — pre/post ratings as they truly stood
// (play order), so every surface shows ratings consistent with the leaderboard
// rather than the approval-order `rating_history` table.
export type MatchSnapshot = {
  id: string; playedOn: string
  team1: { id: string; pre: number; post: number }[]; team2: { id: string; pre: number; post: number }[]
  team1Avg: number; team2Avg: number
  team1Score: number; team2Score: number; team1Won: boolean
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// The ONE ordering rule — used for ranking, for picking award winners, and (via
// import) by the client so the displayed order always matches the rank:
// highest rating → on a tie, more matches played → more wins → tougher schedule
// (higher average-opponent rating) → name. Exported so it can't drift.
type Rankable = { rating: number; avgOpp: number | null; matches: number; wins: number; name: string }
export function standingOrder(a: Rankable, b: Rankable): number {
  return b.rating - a.rating
    || b.matches - a.matches
    || b.wins - a.wins
    || (b.avgOpp ?? 0) - (a.avgOpp ?? 0)
    || a.name.localeCompare(b.name)
}

function simulate(matches: MatchRow[]): { state: Record<string, Stats>; log: MatchSnapshot[] } {
  const state: Record<string, Stats> = {}
  const log: MatchSnapshot[] = []
  const ensure = (id: string) => (state[id] ??= {
    rating: ELO_START, wins: 0, losses: 0, matches: 0,
    oppSum: 0, curStreak: 0, maxStreak: 0, bestUpset: -Infinity, bestUpsetMatchId: null, lastPlayedAt: null,
  })
  for (const m of matches) {
    const t1 = [ensure(m.team1_p1), ensure(m.team1_p2)]
    const t2 = [ensure(m.team2_p1), ensure(m.team2_p2)]
    const t1R = teamRating(t1[0].rating, t1[1].rating)
    const t2R = teamRating(t2[0].rating, t2[1].rating)
    const t1won = m.team1_score > m.team2_score
    // Capture pre-match ratings BEFORE applying the result (post set after).
    const snap: MatchSnapshot = {
      id: m.id, playedOn: m.played_on,
      team1: [{ id: m.team1_p1, pre: t1[0].rating, post: t1[0].rating }, { id: m.team1_p2, pre: t1[1].rating, post: t1[1].rating }],
      team2: [{ id: m.team2_p1, pre: t2[0].rating, post: t2[0].rating }, { id: m.team2_p2, pre: t2[1].rating, post: t2[1].rating }],
      team1Avg: Math.round(t1R), team2Avg: Math.round(t2R),
      team1Score: m.team1_score, team2Score: m.team2_score, team1Won: t1won,
    }
    log.push(snap)
    const apply = (team: Stats[], myR: number, oppR: number, won: boolean) => {
      for (const p of team) {
        p.rating = calcNewRating(p.rating, won, myR, oppR, p.matches)
        p.matches++; p.oppSum += oppR; p.lastPlayedAt = m.played_on
        if (won) {
          p.wins++; p.curStreak++; p.maxStreak = Math.max(p.maxStreak, p.curStreak)
          if (oppR - myR > p.bestUpset) { p.bestUpset = oppR - myR; p.bestUpsetMatchId = m.id }
        } else { p.losses++; p.curStreak = 0 }
      }
    }
    apply(t1, t1R, t2R, t1won)
    apply(t2, t2R, t1R, !t1won)
    snap.team1[0].post = t1[0].rating; snap.team1[1].post = t1[1].rating
    snap.team2[0].post = t2[0].rating; snap.team2[1].post = t2[1].rating
  }
  return { state, log }
}

// A player's rating after each of their matches, in play order — for the
// profile rating graph. Built from the replay so it matches the leaderboard
// (the old graph read rating_history, which is in approval order and drifts
// when matches are approved out of sequence).
export function playerRatingSeries(matches: MatchRow[], playerId: string): { playedOn: string; rating: number }[] {
  const { log } = simulate(matches)
  const out: { playedOn: string; rating: number }[] = []
  for (const s of log) {
    const p = [...s.team1, ...s.team2].find(x => x.id === playerId)
    if (p) out.push({ playedOn: s.playedOn, rating: p.post })
  }
  return out
}

export function buildStandings(
  matches: MatchRow[],
  opts: { nameById: Record<string, string>; debutMonth: Record<string, string>; month: string | null },
): { mainDraw: StandingPlayer[]; qualifying: StandingPlayer[] } {
  const { state } = simulate(matches)
  const all: StandingPlayer[] = Object.entries(state).map(([id, s]) => ({
    id, name: opts.nameById[id] ?? 'Unknown', rating: s.rating,
    wins: s.wins, losses: s.losses, matches: s.matches,
    winRate: s.matches > 0 ? Math.round((s.wins / s.matches) * 100) : null,
    avgOpp: s.matches > 0 ? Math.round(s.oppSum / s.matches) : null,
    maxStreak: s.maxStreak, currentStreak: s.curStreak, lastPlayedAt: s.lastPlayedAt, rank: null, badges: [],
  }))

  const mainDraw = all.filter(p => p.matches >= MAIN_DRAW_MIN).sort(standingOrder)
  const qualifying = all.filter(p => p.matches < MAIN_DRAW_MIN).sort(standingOrder)
  mainDraw.forEach((p, i) => { p.rank = i + 1 })

  const byId = new Map(all.map(p => [p.id, p]))
  const matchById = new Map(matches.map(m => [m.id, m]))
  const give = (p: StandingPlayer | undefined, key: BadgeKey) => { if (p && !p.badges.includes(key)) p.badges.push(key) }
  const pickOne = (cands: StandingPlayer[]) => [...cands].sort(standingOrder)[0]

  // Placement (top 3).
  give(mainDraw[0], 'champion')
  give(mainDraw[1], 'challenger')
  give(mainDraw[2], 'contender')

  // Iron Man — most matches (single winner; ties broken by rating then matches).
  const maxMatches = Math.max(0, ...mainDraw.map(p => p.matches))
  if (maxMatches >= MAIN_DRAW_MIN) give(pickOne(mainDraw.filter(p => p.matches === maxMatches)), 'ironman')

  // Wildfire — longest win streak (single winner by the same tiebreak).
  const maxStreak = Math.max(0, ...mainDraw.map(p => p.maxStreak))
  if (maxStreak >= STREAK_MIN) give(pickOne(mainDraw.filter(p => p.maxStreak === maxStreak)), 'streak')

  // Giant Slayer — the biggest upset of the month, awarded to BOTH players on
  // the winning team (it's a team effort, always two players).
  const slayerCands = all.filter(p => state[p.id].bestUpset >= SLAYER_MIN)
  if (slayerCands.length) {
    const maxUpset = Math.max(...slayerCands.map(p => state[p.id].bestUpset))
    const rep = pickOne(slayerCands.filter(p => state[p.id].bestUpset === maxUpset))
    const matchId = rep ? state[rep.id].bestUpsetMatchId : null
    const m = matchId ? matchById.get(matchId) : undefined
    if (m && rep) {
      const team = [m.team1_p1, m.team1_p2].includes(rep.id) ? [m.team1_p1, m.team1_p2] : [m.team2_p1, m.team2_p2]
      for (const pid of team) give(byId.get(pid), 'slayer')
    }
  }

  // Rookie — best debut-this-month player, once veterans exist (single winner).
  if (opts.month) {
    const hasVeterans = mainDraw.some(p => opts.debutMonth[p.id] !== opts.month)
    if (hasVeterans) give(pickOne(mainDraw.filter(p => opts.debutMonth[p.id] === opts.month)), 'rookie')
  }

  return { mainDraw, qualifying }
}

// ── Award detail (supporting matches) ────────────────────────────────────────
// Replay a window once, returning a match-id → pre-rating snapshot map and each
// player's biggest-upset match id (for Giant Slayer). Callers enrich with names.
export function replaySeason(matches: MatchRow[]): {
  log: Map<string, MatchSnapshot>
  upsetMatchByPlayer: Record<string, string | null>
} {
  const { state, log } = simulate(matches)
  const upsetMatchByPlayer: Record<string, string | null> = {}
  for (const [id, s] of Object.entries(state)) {
    upsetMatchByPlayer[id] = s.bestUpset >= SLAYER_MIN ? s.bestUpsetMatchId : null
  }
  return { log: new Map(log.map(s => [s.id, s])), upsetMatchByPlayer }
}

// Which matches back a given award for a given player.
export function awardMatchIds(
  badge: BadgeKey,
  playerId: string,
  matches: MatchRow[],
  upsetMatchByPlayer: Record<string, string | null>,
): string[] {
  const inMatch = (m: MatchRow) => m.team1_p1 === playerId || m.team1_p2 === playerId || m.team2_p1 === playerId || m.team2_p2 === playerId
  const won = (m: MatchRow) => ([m.team1_p1, m.team1_p2].includes(playerId)) === (m.team1_score > m.team2_score)
  const mine = matches.filter(inMatch)

  if (badge === 'slayer') {
    const id = upsetMatchByPlayer[playerId]
    return id ? [id] : []
  }
  if (badge === 'streak') {
    // The matches forming their longest consecutive-win run.
    let best: string[] = [], cur: string[] = []
    for (const m of mine) {
      if (won(m)) { cur.push(m.id); if (cur.length > best.length) best = [...cur] }
      else cur = []
    }
    return best
  }
  return mine.map(m => m.id) // champion/challenger/contender/ironman/rookie → all their matches
}

export type AwardMatch = {
  id: string; playedOn: string
  winners: { id: string; name: string; rating: number }[]
  losers: { id: string; name: string; rating: number }[]
  winnerAvg: number; loserAvg: number
  winnerScore: number; loserScore: number
}

export function enrichMatches(ids: string[], log: Map<string, MatchSnapshot>, nameById: Record<string, string>): AwardMatch[] {
  const out: AwardMatch[] = []
  for (const id of ids) {
    const s = log.get(id)
    if (!s) continue
    const win = s.team1Won ? s.team1 : s.team2
    const lose = s.team1Won ? s.team2 : s.team1
    out.push({
      id: s.id, playedOn: s.playedOn,
      winners: win.map(w => ({ id: w.id, name: nameById[w.id] ?? 'Unknown', rating: w.pre })),
      losers: lose.map(l => ({ id: l.id, name: nameById[l.id] ?? 'Unknown', rating: l.pre })),
      winnerAvg: s.team1Won ? s.team1Avg : s.team2Avg,
      loserAvg: s.team1Won ? s.team2Avg : s.team1Avg,
      winnerScore: s.team1Won ? s.team1Score : s.team2Score,
      loserScore: s.team1Won ? s.team2Score : s.team1Score,
    })
  }
  return out
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
