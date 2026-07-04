// Americano / Mexicano tournament engine.
//
// Fully standalone: players are free-text names with per-tournament integer
// ids (0..n-1) — no accounts, no Match IQ, no Elo. A tournament is one DB row;
// this module owns the pure logic: round generation and standings.
//
// Formats:
//   - Americano: rotating partners. Each round is chosen to minimise repeat
//     partners (then repeat opponents) across the tournament so far.
//   - Mexicano: standings-based. Court 1 takes the top four (1st & 4th vs
//     2nd & 3rd), court 2 the next four, and so on. Round 1 is a seeded
//     shuffle (no standings exist yet).
//
// Scoring: every match is played to a fixed total (e.g. 21 points) and BOTH
// teams keep the points they scored — an individual's tournament score is the
// sum of their team's points across all their matches.

export type AmericanoPlayer = { id: number; name: string }
export type AmericanoMatch = {
  court: number
  team1: [number, number]
  team2: [number, number]
  score1: number | null
  score2: number | null
}
export type AmericanoRound = { matches: AmericanoMatch[]; sitOut: number[] }
export type AmericanoFormat = 'americano' | 'mexicano'

export type Standing = {
  id: number
  name: string
  points: number
  wins: number
  losses: number
  draws: number
  games: number
  satOut: number
  rank: number
}

export const FORMAT_LABEL = { americano: 'Americano', mexicano: 'Mexicano' } as const

export function tournamentDate(playedOn: string): string {
  // Pin to UTC so a plain YYYY-MM-DD date never shifts a day.
  return new Date(playedOn).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export const POINTS_OPTIONS = [16, 21, 24, 32]
export const MIN_PLAYERS = 4
export const MAX_PLAYERS = 16
export const MAX_COURTS = 4
export const MAX_ROUNDS = 30
export const MAX_NAME_LEN = 60
export const MAX_PLAYER_NAME_LEN = 30

// ── Seeded PRNG (mulberry32) — deterministic rounds for a given tournament ──
function hashSeed(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seededShuffle<T>(arr: T[], rand: () => number): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// ── Standings ────────────────────────────────────────────────────────────────
export function computeStandings(players: AmericanoPlayer[], rounds: AmericanoRound[]): Standing[] {
  const by = new Map<number, Standing>()
  for (const p of players) {
    by.set(p.id, { id: p.id, name: p.name, points: 0, wins: 0, losses: 0, draws: 0, games: 0, satOut: 0, rank: 0 })
  }
  for (const round of rounds) {
    for (const pid of round.sitOut) {
      const s = by.get(pid)
      if (s) s.satOut++
    }
    for (const m of round.matches) {
      if (m.score1 === null || m.score2 === null) continue
      const apply = (team: [number, number], own: number, opp: number) => {
        for (const pid of team) {
          const s = by.get(pid)
          if (!s) continue
          s.points += own
          s.games++
          if (own > opp) s.wins++
          else if (own < opp) s.losses++
          else s.draws++
        }
      }
      apply(m.team1, m.score1, m.score2)
      apply(m.team2, m.score2, m.score1)
    }
  }
  const list = [...by.values()].sort(
    (a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name),
  )
  list.forEach((s, i) => (s.rank = i + 1))
  return list
}

// ── Round generation ─────────────────────────────────────────────────────────
type PairCounts = { partner: Map<string, number>; opponent: Map<string, number> }

function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`
}

function countHistory(rounds: AmericanoRound[]): PairCounts {
  const partner = new Map<string, number>()
  const opponent = new Map<string, number>()
  const bump = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1)
  for (const round of rounds) {
    for (const m of round.matches) {
      bump(partner, pairKey(m.team1[0], m.team1[1]))
      bump(partner, pairKey(m.team2[0], m.team2[1]))
      for (const x of m.team1) for (const y of m.team2) bump(opponent, pairKey(x, y))
    }
  }
  return { partner, opponent }
}

// Penalty for one court of four given history: repeat partners hurt 3x more
// than repeat opponents. `split` picks which of the 3 possible pairings to use.
const SPLITS: [[number, number], [number, number]][] = [
  [[0, 1], [2, 3]],
  [[0, 2], [1, 3]],
  [[0, 3], [1, 2]],
]

function bestSplit(four: number[], counts: PairCounts): { match: { team1: [number, number]; team2: [number, number] }; penalty: number } {
  let best: { match: { team1: [number, number]; team2: [number, number] }; penalty: number } | null = null
  for (const [t1, t2] of SPLITS) {
    const team1: [number, number] = [four[t1[0]], four[t1[1]]]
    const team2: [number, number] = [four[t2[0]], four[t2[1]]]
    let penalty =
      3 * ((counts.partner.get(pairKey(team1[0], team1[1])) ?? 0) +
           (counts.partner.get(pairKey(team2[0], team2[1])) ?? 0))
    for (const x of team1) for (const y of team2) penalty += counts.opponent.get(pairKey(x, y)) ?? 0
    if (!best || penalty < best.penalty) best = { match: { team1, team2 }, penalty }
  }
  return best!
}

/**
 * Generate the next round. Deterministic for a given (seedKey, prior rounds).
 *
 * Sit-outs: when players don't divide evenly into the available courts, the
 * players who have sat out least go off first (ties by id), so byes rotate
 * fairly through the tournament.
 */
export function generateNextRound(
  format: AmericanoFormat,
  players: AmericanoPlayer[],
  rounds: AmericanoRound[],
  courts: number,
  seedKey: string,
): AmericanoRound {
  const n = players.length
  const matchCount = Math.min(courts, Math.floor(n / 4))
  const playingCount = matchCount * 4
  const roundIndex = rounds.length
  const standings = computeStandings(players, rounds)
  const statFor = new Map(standings.map(s => [s.id, s]))

  // Pick sit-outs: fewest sit-outs so far leave first (then lowest id).
  const sitOut: number[] = [...players]
    .sort((a, b) => {
      const sa = statFor.get(a.id)!.satOut - statFor.get(b.id)!.satOut
      return sa !== 0 ? sa : a.id - b.id
    })
    .slice(0, n - playingCount)
    .map(p => p.id)
  const sitSet = new Set(sitOut)
  const active = players.filter(p => !sitSet.has(p.id)).map(p => p.id)

  const rand = mulberry32(hashSeed(`${seedKey}#${roundIndex}`))
  const counts = countHistory(rounds)
  let arrangement: { team1: [number, number]; team2: [number, number] }[]

  if (format === 'mexicano' && roundIndex > 0) {
    // Standings-based courts: chunk the standings order into fours,
    // 1st & 4th vs 2nd & 3rd within each chunk.
    const ordered = standings.filter(s => !sitSet.has(s.id)).map(s => s.id)
    arrangement = []
    for (let c = 0; c < matchCount; c++) {
      const four = ordered.slice(c * 4, c * 4 + 4)
      arrangement.push({ team1: [four[0], four[3]], team2: [four[1], four[2]] })
    }
  } else {
    // Americano (and Mexicano round 1): search seeded shuffles for the
    // arrangement with the fewest repeat partners/opponents.
    let best: { arr: { team1: [number, number]; team2: [number, number] }[]; penalty: number } | null = null
    const attempts = roundIndex === 0 ? 1 : 250
    for (let t = 0; t < attempts; t++) {
      const shuffled = seededShuffle(active, rand)
      const arr: { team1: [number, number]; team2: [number, number] }[] = []
      let penalty = 0
      for (let c = 0; c < matchCount; c++) {
        const pick = bestSplit(shuffled.slice(c * 4, c * 4 + 4), counts)
        arr.push(pick.match)
        penalty += pick.penalty
      }
      if (!best || penalty < best.penalty) best = { arr, penalty }
      if (best.penalty === 0 && t > 0) break
    }
    arrangement = best!.arr
  }

  return {
    matches: arrangement.map((m, i) => ({ court: i + 1, ...m, score1: null, score2: null })),
    sitOut,
  }
}
