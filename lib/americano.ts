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

// joinedAtRound: rounds that already existed when the player was added (0 /
// absent for founding players) — counts as sit-out credit so a late arrival
// plays immediately instead of being benched first. active=false: the player
// left; they keep their standings but are excluded from new rounds.
export type AmericanoPlayer = { id: number; name: string; joinedAtRound?: number; active?: boolean }

export const isActivePlayer = (p: AmericanoPlayer): boolean => p.active !== false
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
  active: boolean
}

export const FORMAT_LABEL = { americano: 'Americano', mexicano: 'Mexicano' } as const

export function tournamentDate(playedOn: string): string {
  // Pin to UTC so a plain YYYY-MM-DD date never shifts a day.
  return new Date(playedOn).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export const POINTS_OPTIONS = [16, 21, 24, 32]
export const MIN_PLAYERS = 4
export const MAX_PLAYERS = 32
export const MAX_COURTS = 8
// High enough for a full partner rotation at big-group sizes on few courts
// (e.g. 20 players / 2 courts needs ~48 rounds); still a runaway backstop.
export const MAX_ROUNDS = 100
export const MAX_NAME_LEN = 60

// ── Tournament math (create-screen planner) ──────────────────────────────────
// Pace calibrated on a real Matchbox night: 43 rounds of 16-point matches on
// 2 courts took ~11.5 hours — roughly one minute per point of court time once
// warm-up, rotation and score entry are included.
export const MINUTES_PER_POINT = 1

// A "true" Americano — every player partners every other player exactly once,
// so everyone plays n−1 matches — needs n(n−1)/4 to be a whole number of
// matches. Only player counts of 4k or 4k+1 qualify (8, 9, 12, 13, 16, 17…).
export const isTrueAmericanoCount = (n: number): boolean => n % 4 === 0 || n % 4 === 1

// Everyone finishing on exactly m matches consumes n·m player-slots, and each
// match seats 4 — so an equal finish needs n·m divisible by 4. Other targets
// still work, but 1–3 players (lowest on the table first) play one extra.
export const isEqualFinishTarget = (n: number, m: number): boolean => (n * m) % 4 === 0

export function totalMatchesFor(n: number, m: number): number {
  return Math.ceil((n * m) / 4)
}

export function roundsFor(n: number, m: number, courts: number): number {
  const perRound = Math.min(courts, Math.floor(n / 4))
  return perRound > 0 ? Math.ceil(totalMatchesFor(n, m) / perRound) : 0
}

export function estimateMinutes(totalMatches: number, points: number, courts: number): number {
  return Math.round((totalMatches * points * MINUTES_PER_POINT) / courts)
}

// Matches a player appears in across all drawn rounds — scored or not.
export function countAppearances(players: AmericanoPlayer[], rounds: AmericanoRound[]): Map<number, number> {
  const by = new Map<number, number>(players.map(p => [p.id, 0]))
  for (const r of rounds) {
    for (const m of r.matches) {
      for (const pid of [...m.team1, ...m.team2]) by.set(pid, (by.get(pid) ?? 0) + 1)
    }
  }
  return by
}

// Progress toward a matches-per-player target. Only active players carry
// remaining need — leavers keep their appearances but stop counting.
export function targetProgress(players: AmericanoPlayer[], rounds: AmericanoRound[], target: number): { appearances: Map<number, number>; totalNeed: number } {
  const appearances = countAppearances(players, rounds)
  let totalNeed = 0
  for (const p of players) {
    if (isActivePlayer(p)) totalNeed += Math.max(0, target - (appearances.get(p.id) ?? 0))
  }
  return { appearances, totalNeed }
}
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
    by.set(p.id, { id: p.id, name: p.name, points: 0, wins: 0, losses: 0, draws: 0, games: 0, satOut: 0, rank: 0, active: isActivePlayer(p) })
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

// Optimal court assignment for a small seated group: recursively anchor the
// first remaining player, try every trio to join their court (bestSplit picks
// the cheapest of the 3 pairings per court independently — penalties are
// additive, so per-court optima compose into the global optimum for that
// partition), and keep the cheapest complete arrangement. Deterministic.
function bestArrangementExhaustive(ids: number[], counts: PairCounts): { arr: { team1: [number, number]; team2: [number, number] }[]; penalty: number } {
  if (ids.length === 0) return { arr: [], penalty: 0 }
  const [anchor, ...rest] = ids
  let best: { arr: { team1: [number, number]; team2: [number, number] }[]; penalty: number } | null = null
  for (let i = 0; i < rest.length - 2; i++) {
    for (let j = i + 1; j < rest.length - 1; j++) {
      for (let k = j + 1; k < rest.length; k++) {
        const pick = bestSplit([anchor, rest[i], rest[j], rest[k]], counts)
        if (best && pick.penalty >= best.penalty) continue
        const remaining = rest.filter((_, idx) => idx !== i && idx !== j && idx !== k)
        const sub = bestArrangementExhaustive(remaining, counts)
        const total = pick.penalty + sub.penalty
        if (!best || total < best.penalty) best = { arr: [pick.match, ...sub.arr], penalty: total }
        if (best.penalty === 0) return best
      }
    }
  }
  return best!
}

// Pick who plays this round. Fairness is absolute: a player with a higher
// priority tuple is always seated before a lower one. Among the players tied
// for the last seats, partner history decides: the candidate seating with the
// fewest repeat partners/opponents wins (when the bench is exactly one round's
// worth it plays next as a block, so its own freshness is scored too). Equal
// penalties fall to the lower-ranked players (bonus court time flows to the
// bottom of the table), then the seed. Mexicano keeps the plain rank tie-break
// — its courts are standings-based, so partner variety isn't the goal there.
function chooseSeated(
  eligible: AmericanoPlayer[],
  seats: number,
  priority: (p: AmericanoPlayer) => number[],
  statFor: Map<number, Standing>,
  counts: PairCounts,
  rand: () => number,
  format: AmericanoFormat,
): number[] {
  const cmpTuple = (a: number[], b: number[]) => {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i]
    return 0
  }
  const rankOf = (p: AmericanoPlayer) => statFor.get(p.id)!.rank
  // Must-play order: priority desc, then worse-ranked first (rank is unique, so this is deterministic).
  const order = [...eligible].sort((a, b) => cmpTuple(priority(b), priority(a)) || rankOf(b) - rankOf(a))
  if (seats >= order.length) return order.map(p => p.id)
  const pivot = priority(order[seats - 1])
  const forcedIn = order.filter(p => cmpTuple(priority(p), pivot) > 0)
  const tied = order.filter(p => cmpTuple(priority(p), pivot) === 0)
  const k = seats - forcedIn.length
  if (format === 'mexicano' || k <= 0 || k >= tied.length) return order.slice(0, seats).map(p => p.id)

  const base = forcedIn.map(p => p.id)
  const pairPenalty = (a: number, b: number) =>
    3 * (counts.partner.get(pairKey(a, b)) ?? 0) + (counts.opponent.get(pairKey(a, b)) ?? 0)
  const groupPenalty = (ids: number[]): number => {
    if (ids.length < 4) return 0
    if (ids.length <= 12 && ids.length % 4 === 0) return bestArrangementExhaustive(ids, counts).penalty
    let total = 0
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) total += pairPenalty(ids[i], ids[j])
    return total
  }
  const benchIsNextRound = eligible.length - seats === seats
  type Candidate = { ids: number[]; penalty: number; rankSum: number }
  let best: Candidate | null = null
  const consider = (pick: AmericanoPlayer[]) => {
    const ids = [...base, ...pick.map(p => p.id)]
    let penalty = groupPenalty(ids)
    if (benchIsNextRound) {
      const idSet = new Set(ids)
      penalty += groupPenalty(eligible.filter(p => !idSet.has(p.id)).map(p => p.id))
    }
    const rankSum = pick.reduce((s, p) => s + rankOf(p), 0)
    if (!best || penalty < best.penalty || (penalty === best.penalty && rankSum > best.rankSum)) best = { ids, penalty, rankSum }
  }

  // Candidate 1: greedy freshness — each seat goes to the tied player who has
  // played least with those already chosen. Then seeded random selections,
  // stopping early once a repeat-free seating is found.
  const pool = seededShuffle(tied, rand)
  const greedy: AmericanoPlayer[] = []
  while (greedy.length < k) {
    const chosen = [...base, ...greedy.map(p => p.id)]
    let pick: AmericanoPlayer | null = null
    let pickCost = Infinity
    for (const p of pool) {
      if (greedy.includes(p)) continue
      const cost = chosen.reduce((s, id) => s + pairPenalty(id, p.id), 0)
      if (cost < pickCost) { pick = p; pickCost = cost }
    }
    greedy.push(pick!)
  }
  consider(greedy)
  const attempts = seats <= 8 ? 40 : seats <= 12 ? 16 : 24
  for (let t = 0; t < attempts && best!.penalty > 0; t++) consider(seededShuffle(tied, rand).slice(0, k))
  return best!.ids
}

// Penalty of one round's courts against a history: repeat partners weigh 3x
// repeat opponents (same metric bestSplit optimises).
function roundPenalty(matches: { team1: [number, number]; team2: [number, number] }[], counts: PairCounts): number {
  let penalty = 0
  for (const m of matches) {
    penalty += 3 * ((counts.partner.get(pairKey(m.team1[0], m.team1[1])) ?? 0) +
                    (counts.partner.get(pairKey(m.team2[0], m.team2[1])) ?? 0))
    for (const x of m.team1) for (const y of m.team2) penalty += counts.opponent.get(pairKey(x, y)) ?? 0
  }
  return penalty
}

// Add or remove one round's pairs from a running history (mutates in place).
function applyRound(counts: PairCounts, matches: { team1: [number, number]; team2: [number, number] }[], sign: 1 | -1): void {
  const nudge = (m: Map<string, number>, k: string) => {
    const v = (m.get(k) ?? 0) + sign
    if (v <= 0) m.delete(k)
    else m.set(k, v)
  }
  for (const m of matches) {
    nudge(counts.partner, pairKey(m.team1[0], m.team1[1]))
    nudge(counts.partner, pairKey(m.team2[0], m.team2[1]))
    for (const x of m.team1) for (const y of m.team2) nudge(counts.opponent, pairKey(x, y))
  }
}

const cloneCounts = (c: PairCounts): PairCounts => ({ partner: new Map(c.partner), opponent: new Map(c.opponent) })

/**
 * Polish a pre-drawn Americano schedule. rounds[from..] are unscored and may
 * be reshaped; everything before `from` is fixed history. Drawing round by
 * round has no lookahead, so late rounds can get cornered into repeats even
 * when a repeat-free schedule exists. This pass swaps one seated player
 * between two unscored rounds — which preserves every player's match count and
 * every round's shape — re-optimises both rounds' courts, and keeps the swap
 * when the repeat penalty drops. Repeats until nothing improves, the schedule
 * is repeat-free, or the time budget runs out (the budget is a safety net for
 * pathological sizes; normal schedules converge in well under it, so the
 * result is deterministic for a given seedKey in practice). Mexicano is
 * untouched — its courts come from live standings.
 */
export function polishSchedule(
  format: AmericanoFormat,
  rounds: AmericanoRound[],
  from: number,
  seedKey: string,
  budgetMs = 2500,
): AmericanoRound[] {
  if (format !== 'americano' || rounds.length - from < 2) return rounds
  const out: AmericanoRound[] = rounds.map(r => ({
    sitOut: [...r.sitOut],
    matches: r.matches.map(m => ({ ...m, team1: [...m.team1] as [number, number], team2: [...m.team2] as [number, number] })),
  }))
  const deadline = Date.now() + budgetMs
  const rand = mulberry32(hashSeed(`${seedKey}#polish`))
  const seatedOf = (r: AmericanoRound) => r.matches.flatMap(m => [...m.team1, ...m.team2])
  const teamsOf = (r: AmericanoRound) => r.matches.map(m => ({ team1: m.team1, team2: m.team2 }))

  // One running history for the whole schedule; a candidate swap is scored
  // against it minus the two rounds being reshaped, so no rebuild per pair.
  const counts = countHistory(out)
  const repeatTotal = () => {
    let p = 0
    for (const v of counts.partner.values()) if (v > 1) p += v - 1
    return p
  }
  const hasRepeat = (r: AmericanoRound) =>
    r.matches.some(m =>
      (counts.partner.get(pairKey(m.team1[0], m.team1[1])) ?? 0) > 1 ||
      (counts.partner.get(pairKey(m.team2[0], m.team2[1])) ?? 0) > 1)

  const rebuild = (r: AmericanoRound, seated: number[], base: PairCounts, swapOut: number, swapIn: number) =>
    seated.length <= 8
      ? bestArrangementExhaustive(seededShuffle(seated, rand), base).arr
      : teamsOf(r).map(m => ({
          team1: m.team1.map(x => (x === swapOut ? swapIn : x)) as [number, number],
          team2: m.team2.map(x => (x === swapOut ? swapIn : x)) as [number, number],
        }))

  const idxs = Array.from({ length: out.length - from }, (_, k) => from + k)
  for (let sweep = 0; sweep < 12 && repeatTotal() > 0 && Date.now() < deadline; sweep++) {
    let improved = false
    const order = seededShuffle(idxs, rand)
    for (let ii = 0; ii < order.length && Date.now() < deadline; ii++) {
      // A round can only be improved if one of its pairs actually repeats
      // somewhere in the schedule — check that against the running history
      // first, so the vast majority of pairs cost nothing.
      if (!hasRepeat(out[order[ii]])) continue
      for (let jj = ii + 1; jj < order.length; jj++) {
        const i = order[ii], j = order[jj]
        if (!hasRepeat(out[i]) && !hasRepeat(out[j])) continue
        // others = full history without rounds i and j
        const others = cloneCounts(counts)
        applyRound(others, teamsOf(out[i]), -1)
        applyRound(others, teamsOf(out[j]), -1)
        const withI = cloneCounts(others)
        applyRound(withI, teamsOf(out[i]), 1)
        const before = roundPenalty(teamsOf(out[i]), others) + roundPenalty(teamsOf(out[j]), withI)
        if (before === 0) continue
        const si = seatedOf(out[i]), sj = seatedOf(out[j])
        const siSet = new Set(si), sjSet = new Set(sj)
        let done = false
        for (const a of seededShuffle(si, rand)) {
          for (const b of seededShuffle(sj, rand)) {
            if (siSet.has(b) || sjSet.has(a)) continue
            const arrI = rebuild(out[i], si.map(x => (x === a ? b : x)), others, a, b)
            const nextI = cloneCounts(others)
            applyRound(nextI, arrI, 1)
            const arrJ = rebuild(out[j], sj.map(x => (x === b ? a : x)), nextI, b, a)
            const after = roundPenalty(arrI, others) + roundPenalty(arrJ, nextI)
            if (after >= before) continue
            applyRound(counts, teamsOf(out[i]), -1)
            applyRound(counts, teamsOf(out[j]), -1)
            const seatI = new Set(si.map(x => (x === a ? b : x)))
            const seatJ = new Set(sj.map(x => (x === b ? a : x)))
            out[i] = { sitOut: [...out[i].sitOut, ...si].filter(x => !seatI.has(x)).sort((x, y) => x - y),
                       matches: arrI.map((m, c) => ({ court: c + 1, ...m, score1: null, score2: null })) }
            out[j] = { sitOut: [...out[j].sitOut, ...sj].filter(x => !seatJ.has(x)).sort((x, y) => x - y),
                       matches: arrJ.map((m, c) => ({ court: c + 1, ...m, score1: null, score2: null })) }
            applyRound(counts, arrI, 1)
            applyRound(counts, arrJ, 1)
            improved = true
            done = true
            break
          }
          if (done) break
        }
      }
    }
    if (!improved) break
  }
  return out
}

/**
 * Generate the next round. Deterministic for a given (seedKey, prior rounds).
 *
 * Seating without a target: when players don't divide evenly into the
 * available courts, the players who have sat out least go off first; ties go
 * off in standings order so marginal slots fall to the lower-ranked players.
 *
 * Seating with a target (matches per player): the most-behind players are
 * seated first, the round shrinks near the finish line so nobody overshoots
 * needlessly, and any spare seats go to the lowest-standing finished players
 * — bonus court time flows to the bottom of the table.
 */
export function generateNextRound(
  format: AmericanoFormat,
  players: AmericanoPlayer[],
  rounds: AmericanoRound[],
  courts: number,
  seedKey: string,
  targetMatches?: number | null,
): AmericanoRound {
  // Only players currently in the tournament are drawn; leavers keep their
  // standings but stop appearing in new rounds.
  const eligible = players.filter(isActivePlayer)
  const n = eligible.length
  const roundIndex = rounds.length
  const standings = computeStandings(players, rounds)
  const statFor = new Map(standings.map(s => [s.id, s]))
  const eligibleSet = new Set(eligible.map(p => p.id))

  // Rounds missed before a late joiner arrived count as sit-out credit, so
  // they get to play immediately instead of being benched on arrival.
  const effectiveSat = (p: AmericanoPlayer) => statFor.get(p.id)!.satOut + (p.joinedAtRound ?? 0)

  // Who plays: fairness is absolute (most-behind / most-benched first), and
  // partner history decides among the players tied for the last seats — see
  // chooseSeated. Rank alone used to break those ties, which froze 16 players
  // on 2 courts into two fixed groups of 8 that never mixed (every partnership
  // repeated from round 15). Seed + history created up front so seating and
  // pairing share them.
  const rand = mulberry32(hashSeed(`${seedKey}#${roundIndex}`))
  const counts = countHistory(rounds)

  let matchCount: number
  let priority: (p: AmericanoPlayer) => number[]
  if (targetMatches != null) {
    const appearances = countAppearances(players, rounds)
    const need = (p: AmericanoPlayer) => Math.max(0, targetMatches - (appearances.get(p.id) ?? 0))
    const totalNeed = eligible.reduce((s, p) => s + need(p), 0)
    matchCount = Math.min(courts, Math.floor(n / 4), Math.max(1, Math.ceil(totalNeed / 4)))
    priority = p => [need(p), effectiveSat(p)]
  } else {
    matchCount = Math.min(courts, Math.floor(n / 4))
    priority = p => [effectiveSat(p)]
  }
  const seatedIds = new Set(chooseSeated(eligible, matchCount * 4, priority, statFor, counts, rand, format))
  const sitOut = eligible.filter(p => !seatedIds.has(p.id)).map(p => p.id)
  const sitSet = new Set(sitOut)
  const active = eligible.filter(p => !sitSet.has(p.id)).map(p => p.id)

  let arrangement: { team1: [number, number]; team2: [number, number] }[]

  if (format === 'mexicano' && roundIndex > 0) {
    // Standings-based courts: chunk the standings order into fours,
    // 1st & 4th vs 2nd & 3rd within each chunk.
    const ordered = standings.filter(s => eligibleSet.has(s.id) && !sitSet.has(s.id)).map(s => s.id)
    arrangement = []
    for (let c = 0; c < matchCount; c++) {
      const four = ordered.slice(c * 4, c * 4 + 4)
      arrangement.push({ team1: [four[0], four[3]], team2: [four[1], four[2]] })
    }
  } else if (roundIndex > 0 && active.length <= 12) {
    // Americano with up to 3 courts in play: exhaustively enumerate every way
    // to split the seated players into courts of four (12 seated = 5,775
    // partitions) and take the arrangement with the fewest repeat
    // partners/opponents. Repeats only happen when history forces them.
    // Seeded pre-shuffle: among equally-optimal arrangements the seed decides,
    // so a reshuffle with a fresh seed genuinely changes the draw.
    arrangement = bestArrangementExhaustive(seededShuffle(active, rand), counts).arr
  } else {
    // Round 1 (seeded variety) and big rounds (13+ seated): search seeded
    // shuffles for the arrangement with the fewest repeat partners/opponents.
    let best: { arr: { team1: [number, number]; team2: [number, number] }[]; penalty: number } | null = null
    const attempts = roundIndex === 0 ? 1 : 400
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
