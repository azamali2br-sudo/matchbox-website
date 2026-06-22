// Match IQ rating curve. Tuned 2026-06-22 to fix top/bottom clumping (everyone
// drifting to the 99/10 clamps). Two structural changes vs the old curve:
//   1. Constant K (no calibration "big-jump"). The old high-K new-player phase
//      was effectively ALWAYS on, because the monthly reset zeroes match counts
//      and most people play <10 matches a month — so 2 wins from 60 hit ~99.
//   2. A steeper divisor (40, not the classic 400) so rating gaps actually
//      predict outcomes on a 10–99 band, restoring the self-correcting "gravity"
//      that keeps players off the clamps.
// Plus a SOFT CEILING: winning gains shrink the higher you already are, so the
// top turns to molasses — ~+5 @80, +2 @90, +1 @95; 99 is an asymptote and 95+
// is genuinely hard to reach. Losses are never damped.

export const ELO_K = 16            // single constant step (no calibration phase)
export const ELO_START = 60
export const ELO_FLOOR = 10
export const ELO_CEILING = 99      // hard cap (effectively unreachable)
export const ELO_SOFT_CEILING = 70 // winning gains start compressing above this
export const ELO_DIVISOR = 40      // steeper than classic 400 to fit the 10–99 band

export function teamRating(r1: number, r2: number): number {
  return (r1 + r2) / 2
}

export function expectedScore(myTeam: number, opponentTeam: number): number {
  return 1 / (1 + Math.pow(10, (opponentTeam - myTeam) / ELO_DIVISOR))
}

// `_matchesPlayed` is kept in the signature for call-site compatibility (the
// replay and the approval handler still pass it) but is no longer used — K is a
// single constant now.
export function calcNewRating(
  current: number,
  won: boolean,
  myTeam: number,
  opponentTeam: number,
  _matchesPlayed?: number,
): number {
  const actual = won ? 1 : 0
  const expected = expectedScore(myTeam, opponentTeam)
  let delta = ELO_K * (actual - expected)
  // Soft ceiling: a winning gain shrinks linearly to 0 as the rating approaches
  // the hard cap, starting from the soft cap. Makes 99 an asymptote.
  if (delta > 0 && current > ELO_SOFT_CEILING) {
    delta *= Math.max(0, (ELO_CEILING - current) / (ELO_CEILING - ELO_SOFT_CEILING))
  }
  const next = current + delta
  return Math.round(Math.min(ELO_CEILING, Math.max(ELO_FLOOR, next)))
}
