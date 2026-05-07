export const ELO_K = 20
export const ELO_START = 60
export const ELO_FLOOR = 20
export const ELO_CEILING = 95

export function teamRating(r1: number, r2: number): number {
  return (r1 + r2) / 2
}

export function expectedScore(myTeam: number, opponentTeam: number): number {
  return 1 / (1 + Math.pow(10, (opponentTeam - myTeam) / 400))
}

export function calcNewRating(current: number, won: boolean, myTeam: number, opponentTeam: number): number {
  const actual = won ? 1 : 0
  const expected = expectedScore(myTeam, opponentTeam)
  const delta = ELO_K * (actual - expected)
  const next = current + delta
  return Math.round(Math.min(ELO_CEILING, Math.max(ELO_FLOOR, next)) * 10) / 10
}
