// Padel set-score validation — shared by the submit form (inline feedback)
// and the matches API (the actual gate), so the two can never disagree.
//
// A set is complete only when won 6–0 … 6–4, 7–5, or 7–6 (tiebreak). A
// deciding 3rd set may instead be a match tiebreak (first to 10, win by 2).
// The per-set winners must add up to the sets score submitted (2–0 / 2–1).

export type SetScoreInput = { t1: number; t2: number }

function isStandardSet(w: number, l: number): boolean {
  if (w === 6) return l >= 0 && l <= 4
  if (w === 7) return l === 5 || l === 6
  return false
}

function isMatchTiebreak(w: number, l: number): boolean {
  return w >= 10 && l >= 0 && w - l >= 2
}

/** Returns an error message, or null when the set scores are valid. */
export function validateSetScores(sets: SetScoreInput[], team1Sets: number, team2Sets: number): string | null {
  const totalSets = team1Sets + team2Sets
  if (sets.length !== totalSets) {
    return `Enter ${totalSets} set ${totalSets === 1 ? 'score' : 'scores'} for a ${team1Sets}–${team2Sets} match.`
  }
  let won1 = 0
  let won2 = 0
  for (let i = 0; i < sets.length; i++) {
    const { t1, t2 } = sets[i]
    if (!Number.isInteger(t1) || !Number.isInteger(t2) || t1 < 0 || t2 < 0) {
      return `Set ${i + 1}: enter whole numbers.`
    }
    if (t1 === t2) return `Set ${i + 1}: a set can't be tied (${t1}–${t2}).`
    const w = Math.max(t1, t2)
    const l = Math.min(t1, t2)
    const deciding = i === sets.length - 1 && sets.length === 3
    const ok = isStandardSet(w, l) || (deciding && isMatchTiebreak(w, l))
    if (!ok) {
      return `Set ${i + 1}: ${t1}–${t2} isn't a finished set. Sets end 6–0 to 6–4, 7–5 or 7–6${deciding ? ' (or a 10-point match tiebreak, win by 2)' : ''}.`
    }
    if (t1 > t2) won1++
    else won2++
  }
  if (won1 !== team1Sets || won2 !== team2Sets) {
    return `Set scores add up to ${won1}–${won2}, but the match score says ${team1Sets}–${team2Sets}.`
  }
  return null
}
