export const ELO_K = 20
export const ELO_K_NEW = 40
export const ELO_START = 60
export const ELO_FLOOR = 20
export const ELO_CEILING = 95
export const CALIBRATION_MATCHES = 10
// Beta mode: 0 = no provisional gate, every player ranks from their first match.
// Raise back to 3 after beta to hide first-timers until they've calibrated.
export const PROVISIONAL_MATCHES = 0

/**
 * Higher K for new players so ratings converge fast (standard Elo practice —
 * FIDE, chess.com both do this). After CALIBRATION_MATCHES, K settles to the
 * normal value so established ratings don't swing wildly.
 */
export function getKFactor(matchesPlayed: number): number {
  return matchesPlayed < CALIBRATION_MATCHES ? ELO_K_NEW : ELO_K
}

export function teamRating(r1: number, r2: number): number {
  return (r1 + r2) / 2
}

export function expectedScore(myTeam: number, opponentTeam: number): number {
  return 1 / (1 + Math.pow(10, (opponentTeam - myTeam) / 400))
}

export function calcNewRating(
  current: number,
  won: boolean,
  myTeam: number,
  opponentTeam: number,
  matchesPlayed: number = CALIBRATION_MATCHES,
): number {
  const actual = won ? 1 : 0
  const expected = expectedScore(myTeam, opponentTeam)
  const delta = getKFactor(matchesPlayed) * (actual - expected)
  const next = current + delta
  return Math.round(Math.min(ELO_CEILING, Math.max(ELO_FLOOR, next)))
}
