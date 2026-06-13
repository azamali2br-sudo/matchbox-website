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

export function sortBadges(keys: BadgeKey[]): BadgeKey[] {
  return [...keys].sort((a, b) => BADGE_ORDER.indexOf(a) - BADGE_ORDER.indexOf(b))
}
