// Match IQ badges — earned per month (and surfaced on the all-time board too).
// Shared by the leaderboard API (emits keys), the leaderboard UI, player
// profiles, and the account dashboard so names/icons never drift.

export type BadgeKey =
  | 'champion' | 'challenger' | 'contender' | 'top5'
  | 'ironman' | 'perfect' | 'streak' | 'slayer' | 'rookie'

export type BadgeDef = {
  key: BadgeKey
  label: string
  icon: string
  tone: 'gold' | 'silver' | 'bronze' | 'orange' | 'cyan' | 'green' | 'red' | 'purple' | 'blue'
  desc: string
}

export const BADGE_DEFS: Record<BadgeKey, BadgeDef> = {
  champion:   { key: 'champion',   label: 'Champion',            icon: '🏆', tone: 'gold',   desc: 'Topped the board this month' },
  challenger: { key: 'challenger', label: 'Challenger',          icon: '🥈', tone: 'silver', desc: 'Runner-up this month' },
  contender:  { key: 'contender',  label: 'Contender',           icon: '🥉', tone: 'bronze', desc: '3rd place this month' },
  top5:       { key: 'top5',       label: 'Top Five',            icon: '✦',  tone: 'orange', desc: 'Finished in the top five' },
  ironman:    { key: 'ironman',    label: 'Iron Man',            icon: '🛡️', tone: 'cyan',   desc: 'Most matches played this month' },
  perfect:    { key: 'perfect',    label: 'Perfect Month',       icon: '💯', tone: 'green',  desc: 'Won every match this month' },
  streak:     { key: 'streak',     label: 'Hot Streak',          icon: '🔥', tone: 'red',    desc: 'Longest win streak this month' },
  slayer:     { key: 'slayer',     label: 'Giant Slayer',        icon: '⚔️', tone: 'purple', desc: 'Biggest upset — beat a much stronger team' },
  rookie:     { key: 'rookie',     label: 'Rookie of the Month', icon: '🌟', tone: 'blue',   desc: 'Best player in their debut month' },
}

export const BADGE_ORDER: BadgeKey[] = [
  'champion', 'challenger', 'contender', 'top5', 'ironman', 'perfect', 'streak', 'slayer', 'rookie',
]

// tone → tailwind classes (text / subtle bg / border) — used by every badge pill.
export const BADGE_TONE: Record<BadgeDef['tone'], string> = {
  gold:   'text-yellow-300 bg-yellow-400/10 border-yellow-400/25',
  silver: 'text-slate-200 bg-slate-300/10 border-slate-300/25',
  bronze: 'text-amber-500 bg-amber-500/10 border-amber-500/25',
  orange: 'text-orange bg-orange/10 border-orange/25',
  cyan:   'text-cyan-300 bg-cyan-400/10 border-cyan-400/25',
  green:  'text-green-400 bg-green-500/10 border-green-500/25',
  red:    'text-red-400 bg-red-500/10 border-red-500/25',
  purple: 'text-purple-300 bg-purple-400/10 border-purple-400/25',
  blue:   'text-blue-300 bg-blue-400/10 border-blue-400/25',
}

// tone → leaderboard-row tile tint. Pairs a faint left-to-right gradient (use
// with `bg-gradient-to-r to-transparent` over the base card) and a coloured left
// accent border, so a badge-holder's whole row reads as highlighted but stays on
// the navy theme. Subtler than the pill so names stay the focus.
export const BADGE_TILE: Record<BadgeDef['tone'], string> = {
  gold:   'border-l-yellow-400/70 from-yellow-400/10',
  silver: 'border-l-slate-300/60 from-slate-300/[0.07]',
  bronze: 'border-l-amber-500/60 from-amber-500/[0.07]',
  orange: 'border-l-orange/60 from-orange/[0.07]',
  cyan:   'border-l-cyan-400/60 from-cyan-400/[0.07]',
  green:  'border-l-green-500/60 from-green-500/[0.07]',
  red:    'border-l-red-500/60 from-red-500/[0.07]',
  purple: 'border-l-purple-400/60 from-purple-400/[0.07]',
  blue:   'border-l-blue-400/60 from-blue-400/[0.07]',
}

// tone → text colour only (for the subdued achievement caption on each row).
export const BADGE_TEXT: Record<BadgeDef['tone'], string> = {
  gold:   'text-yellow-300/90',
  silver: 'text-slate-300/90',
  bronze: 'text-amber-500/90',
  orange: 'text-orange/90',
  cyan:   'text-cyan-300/90',
  green:  'text-green-400/90',
  red:    'text-red-400/90',
  purple: 'text-purple-300/90',
  blue:   'text-blue-300/90',
}

export function sortBadges(keys: BadgeKey[]): BadgeKey[] {
  return [...keys].sort((a, b) => BADGE_ORDER.indexOf(a) - BADGE_ORDER.indexOf(b))
}
