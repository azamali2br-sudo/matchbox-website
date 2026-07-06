'use client'

import { useState, useEffect, useMemo, type ReactNode } from 'react'
import Link from 'next/link'
import { formatTime } from '@/lib/constants'
import { BADGE_DEFS, BADGE_ORDER, BADGE_TEXT, PLACEMENT_BADGES, sortBadges, type BadgeKey } from '@/lib/badges'
import { standingOrder } from '@/lib/leaderboard'

type Player = {
  id: string
  name: string
  rating: number
  wins: number
  losses: number
  matches: number
  winRate: number | null
  avgOpp: number | null
  maxStreak: number
  currentStreak: number
  rank: number | null
  badges: BadgeKey[]
}

type MonthOpt = { value: string; label: string; closed?: boolean }
type ApiResp = {
  month: string | null
  monthLabel: string
  availableMonths: MonthOpt[]
  closed?: boolean
  isCurrentMonth?: boolean
  mainDraw: Player[]
  qualifying: Player[]
  totalMatches: number
  totalPlayers: number
}

type MatchFilter = { month: string | null; date: string | null }
type MatchPlayer = { id: string; name: string; rating: number }
type SetScore = { t1: number; t2: number }
type Match = {
  id: string; played_on: string; court: string | null; start_time: string | null
  team1_score: number; team2_score: number; set_scores: SetScore[] | null
  p1: MatchPlayer; p2: MatchPlayer; p3: MatchPlayer; p4: MatchPlayer
}

// ── Badges ──────────────────────────────────────────────────────────────────
// Badges shown as captions under a name on the board: earned month achievements,
// EXCLUDING placement (rank already shows #1/#2/#3) and 'streak'/Wildfire (a
// month-end award revealed in the recap — its live form is the Hot Streak
// indicator). So: Iron Man, Giant Slayer, Rookie.
const HOT_STREAK_MIN = 3
type Tone = keyof typeof BADGE_TEXT
const BOARD_BADGES = BADGE_ORDER.filter(k => !PLACEMENT_BADGES.includes(k) && k !== 'streak')
function boardBadgeKeys(keys: BadgeKey[]): BadgeKey[] {
  return sortBadges(keys).filter(k => BOARD_BADGES.includes(k))
}
// Does this player have anything to show in the caption? (live streak this
// month, or any board badge)
function hasBoardCaption(p: Player, isCurrentMonth: boolean): boolean {
  return (isCurrentMonth && p.currentStreak >= HOT_STREAK_MIN) || boardBadgeKeys(p.badges).length > 0
}

// One subdued caption under the name. Live "Hot Streak (N)" leads (only on the
// in-progress month, where a current run is meaningful), then any month badges.
function AchievementLine({ player, isCurrentMonth }: { player: Player; isCurrentMonth: boolean }) {
  const items: { label: string; tone: Tone }[] = []
  if (isCurrentMonth && player.currentStreak >= HOT_STREAK_MIN) {
    items.push({ label: `Hot Streak (${player.currentStreak})`, tone: 'red' })
  }
  for (const k of boardBadgeKeys(player.badges)) items.push({ label: BADGE_DEFS[k].label, tone: BADGE_DEFS[k].tone })
  if (!items.length) return null
  return (
    <span className={`font-poppins text-[11px] font-semibold tracking-wide truncate min-w-0 ${BADGE_TEXT[items[0].tone]}`}>
      {items.map(i => i.label).join(' · ')}
    </span>
  )
}

// Collapsible key so a first-time visitor can learn what the captions mean.
// Lists only what shows on the board (Wildfire lives on the recap, not here).
const LEGEND_ENTRIES: { label: string; tone: Tone; desc: string }[] = [
  { label: 'Hot Streak', tone: 'red', desc: 'On a live 3+ win streak right now — resets if they lose. Crowned “Wildfire” at month-end for the longest streak.' },
  ...BOARD_BADGES.map(k => ({ label: BADGE_DEFS[k].label, tone: BADGE_DEFS[k].tone, desc: BADGE_DEFS[k].desc })),
]
function BadgeLegend() {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-navy-card border border-white/8 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-white/[0.02] transition-colors">
        <span className="font-poppins text-xs font-semibold text-white/70">What do the badges mean?</span>
        <span className={`text-white/40 text-[10px] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="border-t border-white/8 px-4 sm:px-6 py-5 grid sm:grid-cols-2 gap-x-10 gap-y-4">
          {LEGEND_ENTRIES.map(d => (
            <div key={d.label}>
              <span className={`font-poppins text-xs font-semibold ${BADGE_TEXT[d.tone]}`}>{d.label}</span>
              <p className="font-poppins text-[11px] text-white/40 leading-relaxed mt-1">{d.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function MatchIQClient() {
  const [tab, setTab] = useState<'leaderboard' | 'skill' | 'matches'>('skill')
  const [month, setMonth] = useState<string | null>(null) // null = latest
  const [data, setData] = useState<ApiResp | null>(null)
  const [loading, setLoading] = useState(true)

  const [matches, setMatches] = useState<Match[]>([])
  const [matchRatings, setMatchRatings] = useState<Record<string, Record<string, number>>>({})
  const [totalAllMatches, setTotalAllMatches] = useState(0)

  // All-time Skill Rating (matchmaking) — lazy-loaded the first time the tab opens.
  const [skill, setSkill] = useState<SkillResp | null>(null)
  const [skillLoading, setSkillLoading] = useState(false)
  useEffect(() => {
    if (tab !== 'skill' || skill) return
    setSkillLoading(true)
    fetch('/api/match-iq/players?view=all')
      .then(r => r.json())
      .then((d: SkillResp) => setSkill(d))
      .finally(() => setSkillLoading(false))
  }, [tab, skill])

  // Monthly board only — the all-time toggle was removed (career stats live on
  // each player's profile). The /api/.../players?view=all path is kept intact
  // so the all-time view can be re-introduced later without a data migration.
  useEffect(() => {
    setLoading(true)
    fetch(`/api/match-iq/players?view=month${month ? `&month=${month}` : ''}`)
      .then(r => r.json())
      .then((d: ApiResp) => setData(d))
      .finally(() => setLoading(false))
  }, [month])

  // Recent Matches has its own scope: all-time by default, narrowable to a
  // month or an exact date (independent of the Monthly Cup's month picker).
  const [matchFilter, setMatchFilter] = useState<MatchFilter>({ month: null, date: null })
  useEffect(() => {
    const qs = matchFilter.date ? `limit=100&date=${matchFilter.date}`
      : matchFilter.month ? `limit=100&month=${matchFilter.month}`
      : 'limit=200'
    fetch(`/api/match-iq/matches?${qs}`)
      .then(r => r.json())
      .then(d => { setMatches(d.matches ?? []); setMatchRatings(d.matchRatings ?? {}); setTotalAllMatches(d.total ?? 0) })
  }, [matchFilter])

  return (
    <div className="min-h-screen bg-navy pt-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Hero */}
        <div className="flex items-center gap-3 mb-5">
          <div className="inline-flex items-center gap-2 bg-orange/10 border border-orange/25 rounded-full px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-orange animate-pulse" />
            <span className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest">Live Rankings</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
          <div>
            <h1 className="font-qaranta text-5xl sm:text-6xl md:text-7xl text-white uppercase leading-none">
              Match <span className="text-orange">IQ</span>
            </h1>
            <p className="font-poppins text-white/50 text-sm mt-3 max-w-md">
              {tab === 'skill'
                ? <>Pakistan&apos;s first padel Elo rating system. Your Skill Rating is your all-time level — it never resets, and it&apos;s the number to use when you&apos;re putting a game together.</>
                : tab === 'leaderboard'
                  ? <>The monthly title race. Everyone resets to 60 on the 1st — play 3+ matches to enter the Main Draw and chase the champion&apos;s crown.</>
                  : <>Every approved match, newest first. The rating next to each name is what that player walked into the match with.</>}
            </p>
          </div>
          <Link href="/match-iq/submit"
            className="inline-flex items-center gap-2 bg-orange hover:bg-orange-dark text-white font-poppins font-semibold text-sm px-6 py-3.5 rounded-full transition-all duration-200 hover:shadow-xl hover:shadow-orange/30 shrink-0">
            + Submit Match
          </Link>
        </div>

        {/* Stats strip — scope follows the active tab: Monthly Cup shows the
            selected month, everything else shows all-time. */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-7">
          {(tab === 'leaderboard'
            ? (() => {
                const scope = data && !data.isCurrentMonth && data.monthLabel ? `in ${data.monthLabel}` : 'this month'
                return [
                  { label: `Players ${scope}`, value: data?.totalPlayers || '—' },
                  { label: `Matches ${scope}`, value: data?.totalMatches || '—' },
                  { label: 'Starting rating', value: 60 },
                ]
              })()
            : [
                { label: 'Players all time', value: skill?.totalPlayers || '—' },
                { label: 'Matches all time', value: skill?.totalMatches || '—' },
                { label: 'Starting rating', value: 60 },
              ]
          ).map(s => (
            <div key={s.label} className="bg-navy-card border border-white/8 rounded-2xl px-3 py-4 sm:p-5">
              <div className="font-qaranta text-2xl sm:text-3xl text-orange leading-none">{s.value}</div>
              <div className="font-poppins text-white/40 text-[11px] sm:text-xs mt-1.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-navy-card border border-white/8 rounded-xl p-1 w-fit mb-6">
          {(['skill', 'leaderboard', 'matches'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`font-poppins text-xs font-semibold px-3.5 sm:px-5 py-2.5 rounded-lg transition-all ${tab === t ? 'bg-orange text-white' : 'text-white/40 hover:text-white/70'}`}>
              {t === 'leaderboard' ? 'Monthly Cup' : t === 'skill' ? 'Skill Rating' : 'Recent Matches'}
            </button>
          ))}
        </div>

        {tab === 'leaderboard'
          ? <Leaderboard data={data} loading={loading} month={month} setMonth={setMonth} />
          : tab === 'skill'
            ? <SkillBoard data={skill} loading={skillLoading} />
            : <RecentMatches matches={matches} matchRatings={matchRatings} total={totalAllMatches}
                availableMonths={data?.availableMonths ?? []} filter={matchFilter} setFilter={setMatchFilter} />}
      </div>
    </div>
  )
}

// ── Leaderboard ──────────────────────────────────────────────────────────────
type SortCol = 'rating' | 'matches' | 'wins' | 'losses' | 'winRate' | 'avgOpp'
type SortState = { col: SortCol; dir: 'asc' | 'desc' }

// Shared by the Monthly Cup and Skill Rating tables (same column set).
const BOARD_GRID = 'grid-cols-[2.5rem_1fr_5rem_3.5rem_5rem_4.5rem_5rem]'
const SORT_COLS: { key: SortCol; label: string; align: string }[] = [
  { key: 'rating', label: 'Rating', align: 'text-right' },
  { key: 'matches', label: 'M', align: 'text-center' },
  { key: 'wins', label: 'W/L', align: 'text-center' },
  { key: 'winRate', label: 'Win%', align: 'text-right' },
  { key: 'avgOpp', label: 'Avg Opp', align: 'text-right' },
]

// Long lists collapse past this many rows so the page stays scannable — the
// rest expands in place via one button. Deliberately NOT an inner scrollbox:
// nested scroll areas trap the thumb on mobile and hide how much content exists.
const ROW_CAP = 10
function ExpandableRows<T>({ items, render, noun }: {
  items: T[]; render: (item: T) => ReactNode; noun: string
}) {
  const [expanded, setExpanded] = useState(false)
  // Not worth hiding just a row or two behind a button.
  const collapsible = items.length > ROW_CAP + 2
  if (!collapsible) return <>{items.map(render)}</>
  return (
    <>
      {(expanded ? items : items.slice(0, ROW_CAP)).map(render)}
      <button onClick={() => setExpanded(e => !e)}
        className="w-full font-poppins text-xs font-semibold text-white/50 hover:text-orange bg-navy-card border border-white/8 hover:border-orange/30 rounded-2xl py-3.5 transition-all">
        {expanded ? 'Show less ▴' : `Show all ${items.length} ${noun} ▾`}
      </button>
    </>
  )
}

// Sort controls: pills on mobile, clickable column headers on desktop.
function SortControls({ sort, setSort }: { sort: SortState; setSort: (s: SortState) => void }) {
  const toggle = (col: SortCol) => setSort(sort.col === col ? { col, dir: sort.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' })
  const caret = (col: SortCol) => sort.col === col ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''
  return (
    <>
      {/* Mobile sort control */}
      <div className="sm:hidden flex items-center gap-2 mb-1">
        <span className="font-poppins text-white/30 text-[11px] uppercase tracking-wider">Sort</span>
        <div className="flex flex-wrap gap-1">
          {SORT_COLS.map(c => (
            <button key={c.key} onClick={() => toggle(c.key)}
              className={`font-poppins text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${sort.col === c.key ? 'border-orange/40 text-orange bg-orange/10' : 'border-white/8 text-white/40'}`}>
              {c.label}{caret(c.key)}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop header */}
      <div className={`hidden sm:grid ${BOARD_GRID} gap-3 px-5 pb-1`}>
        <div />
        <span className="font-poppins text-white/30 text-xs uppercase tracking-wider">Player</span>
        {SORT_COLS.map(c => (
          <button key={c.key} onClick={() => toggle(c.key)}
            className={`font-poppins text-xs uppercase tracking-wider hover:text-white/70 transition-colors ${c.align} ${sort.col === c.key ? 'text-orange' : 'text-white/30'}`}>
            {c.label}{caret(c.key)}
          </button>
        ))}
      </div>
    </>
  )
}

function Leaderboard({
  data, loading, month, setMonth,
}: {
  data: ApiResp | null; loading: boolean
  month: string | null; setMonth: (m: string | null) => void
}) {
  const [draw, setDraw] = useState<'main' | 'qualifying'>('main')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' }>({ col: 'rating', dir: 'desc' })

  const activeMonth = data?.month ?? month
  const isCurrentMonth = data?.isCurrentMonth ?? false

  const shown = useMemo(() => {
    const list = draw === 'main' ? (data?.mainDraw ?? []) : (data?.qualifying ?? [])
    const q = search.trim().toLowerCase()
    const filtered = q ? list.filter(p => p.name.toLowerCase().includes(q)) : list
    const { col, dir } = sort
    const m = dir === 'desc' ? -1 : 1
    const val = (p: Player) => col === 'winRate' ? (p.winRate ?? -1) : col === 'avgOpp' ? (p.avgOpp ?? -1) : p[col]
    // Ties fall back to the canonical standing order so the displayed order
    // always matches the server-assigned rank (e.g. equal rating → higher avg
    // opponent ranks first).
    return [...filtered].sort((a, b) => (val(a) - val(b)) * m || standingOrder(a, b))
  }, [data, draw, search, sort])

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-navy-card rounded-2xl animate-pulse" />)}</div>
  }

  return (
    <div className="space-y-5">
      {/* Period controls — monthly only (month picker + recap) */}
      <div className="flex flex-wrap items-center gap-2.5">
        {data && (
          <div className="relative">
            <select
              value={activeMonth ?? ''}
              onChange={e => setMonth(e.target.value)}
              className="appearance-none font-poppins text-xs font-semibold text-white bg-navy-card border border-white/8 rounded-xl pl-4 pr-9 py-2.5 cursor-pointer hover:border-white/20 focus:border-orange/40 outline-none">
              {data.availableMonths.map(m => <option key={m.value} value={m.value} className="bg-navy">{m.label}</option>)}
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-[10px]">▼</span>
          </div>
        )}
        {data?.closed && (
          <span className="font-poppins text-[10px] font-semibold uppercase tracking-wide text-green-400 border border-green-500/30 bg-green-500/10 rounded-full px-2.5 py-1">
            ✓ Final
          </span>
        )}
        {activeMonth && (
          <Link href={`/match-iq/season/${activeMonth}`}
            className="font-poppins text-[11px] font-semibold text-orange/80 hover:text-orange border border-orange/25 hover:border-orange/50 rounded-full px-3 py-1.5">
            Season recap ↗
          </Link>
        )}
        {data?.closed && (
          <p className="font-poppins text-white/30 text-xs ml-auto hidden sm:block">Final standings — season closed</p>
        )}
      </div>

      {/* Draw toggle + search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-1 bg-navy-card border border-white/8 rounded-xl p-1">
          <button onClick={() => setDraw('main')}
            className={`font-poppins text-xs font-semibold px-4 py-2 rounded-lg transition-all ${draw === 'main' ? 'bg-orange text-white' : 'text-white/40 hover:text-white/70'}`}>
            Main Draw <span className="opacity-60">{data?.mainDraw.length ?? 0}</span>
          </button>
          <button onClick={() => setDraw('qualifying')}
            className={`font-poppins text-xs font-semibold px-4 py-2 rounded-lg transition-all ${draw === 'qualifying' ? 'bg-orange text-white' : 'text-white/40 hover:text-white/70'}`}>
            Qualifying <span className="opacity-60">{data?.qualifying.length ?? 0}</span>
          </button>
        </div>
        <div className="relative sm:ml-auto sm:w-56">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player…"
            className="w-full font-poppins text-sm text-white placeholder-white/30 bg-navy-card border border-white/8 rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-orange/40" />
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">⌕</span>
        </div>
      </div>

      {draw === 'qualifying' && (
        <p className="font-poppins text-white/35 text-xs -mt-3">
          Played fewer than 3 matches this month — not ranked yet (too few games to be fair). The counter shows how close each player is to the Main Draw.
        </p>
      )}

      {/* Badge guide — only relevant to the ranked Main Draw */}
      {draw === 'main' && !search && shown.some(p => hasBoardCaption(p, isCurrentMonth)) && <BadgeLegend />}

      {/* Table */}
      {shown.length === 0 ? (
        <div className="text-center py-16 bg-navy-card border border-white/8 rounded-2xl">
          <p className="font-qaranta text-3xl text-white/20 uppercase mb-2">
            {search ? 'No match' : draw === 'main' ? 'No ranked players yet' : 'Nobody here'}
          </p>
          <p className="font-poppins text-white/30 text-sm">
            {search ? 'Try a different name.' : draw === 'main' ? 'Play 3+ matches to make the Main Draw.' : 'Everyone has made the Main Draw.'}
          </p>
        </div>
      ) : (
        <LeaderTable key={`${draw}-${activeMonth ?? ''}`} players={shown} provisional={draw === 'qualifying'} isCurrentMonth={isCurrentMonth} sort={sort} setSort={setSort} />
      )}
    </div>
  )
}

// ── Sortable table ───────────────────────────────────────────────────────────
function LeaderTable({
  players, provisional, isCurrentMonth, sort, setSort,
}: {
  players: Player[]; provisional: boolean; isCurrentMonth: boolean
  sort: SortState; setSort: (s: SortState) => void
}) {
  return (
    <div className="space-y-2">
      <SortControls sort={sort} setSort={setSort} />

      <ExpandableRows items={players} noun="players" render={player => {
        const rank = player.rank
        const rankColor = provisional ? 'text-white/30'
          : rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-amber-600' : 'text-white/30'
        // Uniform tiles — the rank number's colour (gold/silver/bronze) is the
        // only podium signal, which reads cleaner than per-row border tints.
        const borderColor = provisional ? 'border-white/5' : 'border-white/8'

        // Standard tile. Live Hot Streak + month badges are written under the
        // name as a caption (see AchievementLine).
        const hasAch = !provisional && hasBoardCaption(player, isCurrentMonth)

        return (
          <Link key={player.id} href={`/match-iq/${player.id}`}
            className={`block bg-navy-card border ${borderColor} rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 hover:border-orange/30 transition-all group`}>
            {/* Mobile */}
            <div className="sm:hidden flex items-start gap-3">
              {provisional ? (
                <span className="w-7 shrink-0 text-center mt-1 font-poppins text-[11px] font-semibold leading-none text-orange/70">{player.matches}<span className="text-white/25">/3</span></span>
              ) : (
                <span className={`font-qaranta text-lg leading-none w-7 shrink-0 text-center mt-0.5 ${rankColor}`}>{rank ?? '—'}</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-poppins text-white text-sm font-semibold break-words leading-snug group-hover:text-orange transition-colors">{player.name}</p>
                {hasAch && <div className="mt-1"><AchievementLine player={player} isCurrentMonth={isCurrentMonth} /></div>}
                <p className="font-poppins text-white/40 text-[11px] mt-1">
                  <span>{player.matches} {player.matches === 1 ? 'match' : 'matches'}</span>
                  <span className="text-white/20 mx-1">·</span>
                  <span className="text-green-400">{player.wins}W</span> <span className="text-red-400/70">{player.losses}L</span>
                  {player.winRate !== null && <><span className="text-white/20 mx-1">·</span><span>{player.winRate}%</span></>}
                  {player.avgOpp !== null && <><span className="text-white/20 mx-1">·</span><span>opp {player.avgOpp}</span></>}
                </p>
              </div>
              <span className={`font-qaranta text-2xl shrink-0 leading-none ${provisional ? 'text-white/50' : 'text-orange'}`}>{player.rating}</span>
            </div>

            {/* Desktop */}
            <div className={`hidden sm:grid ${BOARD_GRID} gap-3 items-center`}>
              {provisional ? (
                <span className="text-center font-poppins text-[11px] font-semibold leading-none text-orange/70">{player.matches}<span className="text-white/25">/3</span></span>
              ) : (
                <span className={`font-qaranta text-lg leading-none text-center ${rankColor}`}>{rank ?? '—'}</span>
              )}
              <div className="flex flex-col justify-center gap-0.5 min-w-0">
                <p className="font-poppins text-white text-sm font-semibold group-hover:text-orange transition-colors truncate">{player.name}</p>
                {hasAch && <AchievementLine player={player} isCurrentMonth={isCurrentMonth} />}
              </div>
              <span className={`font-qaranta text-xl text-right ${provisional ? 'text-white/50' : 'text-orange'}`}>{player.rating}</span>
              <span className="font-poppins text-white/60 text-sm text-center font-medium">{player.matches}</span>
              <span className="font-poppins text-xs text-center">
                <span className="text-green-400">{player.wins}</span><span className="text-white/20 mx-1">/</span><span className="text-red-400/70">{player.losses}</span>
              </span>
              <span className="font-poppins text-white/45 text-xs text-right">{player.winRate !== null ? `${player.winRate}%` : '—'}</span>
              <span className="font-poppins text-white/45 text-xs text-right">{player.avgOpp ?? '—'}</span>
            </div>
          </Link>
        )
      }} />
    </div>
  )
}

// ── Skill Rating (all-time, matchmaking) ─────────────────────────────────────
// The persistent skill number: one continuous Elo replay over all matches, no
// monthly reset. Rated players (3+ lifetime) split into Active (played within
// dormantDays) and Dormant (idle longer — rating kept, NO decay, parked off the
// live board; doubles as a re-engagement list). Provisional = under 3 matches.
type SkillPlayer = {
  id: string; name: string; rating: number
  wins: number; losses: number; matches: number
  winRate: number | null; avgOpp: number | null
  rank: number | null; topPct: number | null
  lastPlayedAt: string | null; daysIdle: number | null
}
type SkillResp = {
  label: string; dormantDays: number; ratedCount: number
  active: SkillPlayer[]; dormant: SkillPlayer[]; provisional: SkillPlayer[]
  totalMatches: number; totalPlayers: number
}

function rankColorFor(rank: number | null): string {
  return rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-amber-600' : 'text-white/30'
}

type SkillKind = 'active' | 'dormant' | 'calibrating'

function SkillRow({ p, kind }: { p: SkillPlayer; kind: SkillKind }) {
  const dormant = kind === 'dormant'
  const calibrating = kind === 'calibrating'
  const ratingColor = calibrating || dormant ? 'text-white/45' : 'text-orange'

  // Sub-name caption: "last played" for dormant; none otherwise.
  const caption = dormant && p.daysIdle !== null ? (
    <span className="font-poppins text-[11px] text-white/40 truncate min-w-0 block">last played {p.daysIdle}d ago</span>
  ) : null

  const rankCell = calibrating
    ? <span className="font-poppins text-[11px] font-semibold leading-none text-orange/70">{p.matches}<span className="text-white/25">/3</span></span>
    : dormant
      ? <span className="font-qaranta text-lg leading-none text-white/25">·</span>
      : <span className={`font-qaranta text-lg leading-none ${rankColorFor(p.rank)}`}>{p.rank ?? '—'}</span>

  return (
    <Link href={`/match-iq/${p.id}`}
      className={`block bg-navy-card border ${calibrating ? 'border-white/5' : 'border-white/8'} rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 hover:border-orange/30 transition-all group`}>
      {/* Mobile — all stats on one meta line */}
      <div className="sm:hidden flex items-start gap-3">
        <span className="w-7 shrink-0 text-center mt-0.5">{rankCell}</span>
        <div className="flex-1 min-w-0">
          <p className="font-poppins text-white text-sm font-semibold break-words leading-snug group-hover:text-orange transition-colors">{p.name}</p>
          {caption && <div className="mt-0.5">{caption}</div>}
          <p className="font-poppins text-white/40 text-[11px] mt-1">
            <span>{p.matches} {p.matches === 1 ? 'match' : 'matches'}</span>
            <span className="text-white/20 mx-1">·</span>
            <span className="text-green-400">{p.wins}W</span> <span className="text-red-400/70">{p.losses}L</span>
            {p.winRate !== null && <><span className="text-white/20 mx-1">·</span><span>{p.winRate}%</span></>}
            {p.avgOpp !== null && <><span className="text-white/20 mx-1">·</span><span>opp {p.avgOpp}</span></>}
          </p>
        </div>
        <span className={`font-qaranta text-2xl shrink-0 leading-none ${ratingColor}`}>{p.rating}</span>
      </div>

      {/* Desktop — same columns as the Monthly Cup table */}
      <div className={`hidden sm:grid ${BOARD_GRID} gap-3 items-center`}>
        <div className="text-center">{rankCell}</div>
        <div className="flex flex-col justify-center gap-0.5 min-w-0">
          <p className="font-poppins text-white text-sm font-semibold group-hover:text-orange transition-colors truncate">{p.name}</p>
          {caption}
        </div>
        <span className={`font-qaranta text-xl text-right ${ratingColor}`}>{p.rating}</span>
        <span className="font-poppins text-white/60 text-sm text-center font-medium">{p.matches}</span>
        <span className="font-poppins text-xs text-center">
          <span className="text-green-400">{p.wins}</span><span className="text-white/20 mx-1">/</span><span className="text-red-400/70">{p.losses}</span>
        </span>
        <span className="font-poppins text-white/45 text-xs text-right">{p.winRate !== null ? `${p.winRate}%` : '—'}</span>
        <span className="font-poppins text-white/45 text-xs text-right">{p.avgOpp ?? '—'}</span>
      </div>
    </Link>
  )
}

// Collapsed by default (matches the BadgeLegend toggle) so it doesn't dominate
// the board on load — the ratings should lead, not the explainer.
function SkillIntro() {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-navy-card border border-white/8 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3 text-left hover:bg-white/[0.02] transition-colors">
        <span className="font-poppins text-xs font-semibold text-white/70">How does Skill Rating work?</span>
        <span className={`text-white/40 text-[10px] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="border-t border-white/8 px-4 sm:px-6 py-4">
          <p className="font-poppins text-white/60 text-xs leading-relaxed">
            Your all-time skill — it carries across months and never resets, so it&apos;s the number to use when you&apos;re finding a game. Ask the group for the level you want, e.g. &ldquo;need three 75+ players for 8&ndash;10PM at Matchbox&rdquo;. Needs 3+ matches to show.
          </p>
        </div>
      )}
    </div>
  )
}

function SkillBoard({ data, loading }: { data: SkillResp | null; loading: boolean }) {
  const [view, setView] = useState<'active' | 'dormant' | 'new'>('active')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortState>({ col: 'rating', dir: 'desc' })

  const q = search.trim().toLowerCase()
  const shown = useMemo(() => {
    if (!data) return []
    const list = view === 'active' ? data.active : view === 'dormant' ? data.dormant : data.provisional
    const filtered = q ? list.filter(p => p.name.toLowerCase().includes(q)) : list
    const { col, dir } = sort
    const m = dir === 'desc' ? -1 : 1
    const val = (p: SkillPlayer) => col === 'winRate' ? (p.winRate ?? -1) : col === 'avgOpp' ? (p.avgOpp ?? -1) : p[col]
    // Ties fall back to the canonical standing order so the displayed order
    // always matches the server-assigned rank (same rule as the Monthly Cup).
    return [...filtered].sort((a, b) => (val(a) - val(b)) * m || standingOrder(a, b))
  }, [data, view, q, sort])

  if (loading || !data) {
    return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-navy-card rounded-2xl animate-pulse" />)}</div>
  }

  // Three groups, toggled one at a time — mirrors the Monthly Cup Main Draw /
  // Qualifying split so each is quick to scan.
  const groups = {
    active: { label: 'Active', kind: 'active' as SkillKind, all: data.active, subtitle: 'Played in the last 15 days — your live matchmaking pool.' },
    dormant: { label: 'Dormant', kind: 'dormant' as SkillKind, all: data.dormant, subtitle: `Haven't played in ${data.dormantDays}+ days — rating kept, just off the live board. Nudge them back.` },
    new: { label: 'New', kind: 'calibrating' as SkillKind, all: data.provisional, subtitle: 'Fewer than 3 matches — not rated for matchmaking yet.' },
  }
  const g = groups[view]
  const emptyCopy = {
    active: { head: 'No active players', sub: 'Rated players who played in the last 15 days appear here.' },
    dormant: { head: 'Nobody dormant', sub: 'Everyone rated has played within the last 15 days.' },
    new: { head: 'No new players', sub: 'Players with fewer than 3 matches appear here.' },
  }[view]

  return (
    <div className="space-y-5">
      <SkillIntro />

      {/* Group toggle + search (mirrors the Monthly Cup Main Draw / Qualifying split) */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-1 bg-navy-card border border-white/8 rounded-xl p-1">
            {(['active', 'dormant', 'new'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`font-poppins text-xs font-semibold px-3.5 sm:px-4 py-2 rounded-lg transition-all ${view === v ? 'bg-orange text-white' : 'text-white/40 hover:text-white/70'}`}>
                {groups[v].label} <span className="opacity-60">{groups[v].all.length}</span>
              </button>
            ))}
          </div>
          <div className="relative sm:ml-auto sm:w-56">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search player…"
              className="w-full font-poppins text-sm text-white placeholder-white/30 bg-navy-card border border-white/8 rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-orange/40" />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">⌕</span>
          </div>
        </div>
        <p className="font-poppins text-white/35 text-xs">{g.subtitle}</p>
      </div>

      {shown.length === 0 ? (
        <div className="text-center py-16 bg-navy-card border border-white/8 rounded-2xl">
          <p className="font-qaranta text-3xl text-white/20 uppercase mb-2">{q ? 'No match' : emptyCopy.head}</p>
          <p className="font-poppins text-white/30 text-sm">{q ? 'Try a different name.' : emptyCopy.sub}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <SortControls sort={sort} setSort={setSort} />
          <ExpandableRows key={view} items={shown} noun="players"
            render={p => <SkillRow key={p.id} p={p} kind={g.kind} />} />
        </div>
      )}
    </div>
  )
}

// ── Recent matches ───────────────────────────────────────────────────────────
function RecentMatches({ matches, matchRatings, total, availableMonths, filter, setFilter }: {
  matches: Match[]; matchRatings: Record<string, Record<string, number>>; total: number
  availableMonths: MonthOpt[]; filter: MatchFilter; setFilter: (f: MatchFilter) => void
}) {
  const filtered = filter.month !== null || filter.date !== null

  // All-time by default; narrow to a month via the dropdown or an exact day via
  // the date picker. Picking one clears the other so the active scope is always
  // unambiguous.
  const controls = (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative">
        <select
          value={filter.month ?? ''}
          onChange={e => setFilter({ month: e.target.value || null, date: null })}
          className="appearance-none font-poppins text-xs font-semibold text-white bg-navy-card border border-white/8 rounded-xl pl-4 pr-9 py-2.5 cursor-pointer hover:border-white/20 focus:border-orange/40 outline-none">
          <option value="" className="bg-navy">All time</option>
          {availableMonths.map(m => <option key={m.value} value={m.value} className="bg-navy">{m.label}</option>)}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-[10px]">▼</span>
      </div>
      <input
        type="date"
        value={filter.date ?? ''}
        onChange={e => setFilter({ month: null, date: e.target.value || null })}
        className="font-poppins text-xs font-semibold text-white bg-navy-card border border-white/8 rounded-xl px-4 py-2.5 cursor-pointer hover:border-white/20 focus:border-orange/40 outline-none [color-scheme:dark]"
      />
      {filtered && (
        <button onClick={() => setFilter({ month: null, date: null })}
          className="font-poppins text-[11px] font-semibold text-white/50 hover:text-orange border border-white/10 hover:border-orange/40 rounded-full px-3 py-1.5 transition-colors">
          Clear ✕
        </button>
      )}
      <p className="font-poppins text-white/30 text-xs ml-auto hidden sm:block">
        {total} {total === 1 ? 'match' : 'matches'}
      </p>
      <p className="basis-full font-poppins text-white/30 text-xs">
        Ratings on each card are what the players walked into that match with — check Skill Rating for where they stand now.
      </p>
    </div>
  )

  if (matches.length === 0) {
    return (
      <div className="space-y-5">
        {controls}
        <div className="text-center py-24">
          <p className="font-qaranta text-4xl text-white/20 uppercase mb-3">{filtered ? 'No Matches Here' : 'No Matches Yet'}</p>
          <p className="font-poppins text-white/30 text-sm">
            {filter.date ? 'Nothing was played on this date.' : filter.month ? 'Nothing was played this month.' : 'Approved matches will appear here.'}
          </p>
        </div>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {controls}
      <ExpandableRows key={filter.date ?? filter.month ?? 'all'} items={matches} noun="matches" render={match => {
        const team1Won = match.team1_score > match.team2_score
        const ratings = matchRatings[match.id] ?? {}
        const r1 = Math.round(ratings[match.p1.id] ?? match.p1.rating)
        const r2 = Math.round(ratings[match.p2.id] ?? match.p2.rating)
        const r3 = Math.round(ratings[match.p3.id] ?? match.p3.rating)
        const r4 = Math.round(ratings[match.p4.id] ?? match.p4.rating)
        const avg1 = Math.round((r1 + r2) / 2), avg2 = Math.round((r3 + r4) / 2)
        const ratingGap = Math.abs(avg1 - avg2)
        const isUpset = (team1Won && avg1 < avg2) || (!team1Won && avg2 < avg1)
        const winnerBorder = team1Won ? 'border-l-orange/40' : 'border-r-orange/40'
        return (
          <div key={match.id} className={`bg-navy-card border border-white/6 rounded-2xl overflow-hidden hover:border-white/15 transition-colors border-l-2 border-r-2 ${winnerBorder}`}>
            <div className="flex items-center gap-3 px-4 sm:px-5 py-5">
              <div className="flex-1 text-right space-y-2.5">
                {[{ p: match.p1, r: r1 }, { p: match.p2, r: r2 }].map(({ p, r }) => (
                  <div key={p.id} className="flex items-center justify-end gap-2">
                    <Link href={`/match-iq/${p.id}`} className={`font-poppins text-sm font-medium hover:underline leading-tight break-words ${team1Won ? 'text-white' : 'text-white/40'}`}>{p.name}</Link>
                    <span className={`font-poppins text-xs font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${team1Won ? 'bg-orange/15 text-orange/90' : 'bg-white/5 text-white/30'}`}>{r}</span>
                  </div>
                ))}
              </div>
              <div className="shrink-0 text-center w-24 sm:w-28">
                {ratingGap >= 5 && <p className="font-poppins text-white/20 text-xs mb-1.5 tracking-wide">{avg1} <span className="text-white/10 mx-0.5">·</span> {avg2}</p>}
                <div className="flex items-center justify-center gap-2">
                  <span className={`font-qaranta text-3xl sm:text-4xl leading-none ${team1Won ? 'text-orange' : 'text-white/25'}`}>{match.team1_score}</span>
                  <span className="font-poppins text-white/15 text-base">–</span>
                  <span className={`font-qaranta text-3xl sm:text-4xl leading-none ${!team1Won ? 'text-orange' : 'text-white/25'}`}>{match.team2_score}</span>
                </div>
                {match.set_scores && <p className="font-poppins text-white/20 text-[11px] sm:text-xs mt-1.5">{match.set_scores.map(s => `${s.t1}–${s.t2}`).join(', ')}</p>}
              </div>
              <div className="flex-1 space-y-2.5">
                {[{ p: match.p3, r: r3 }, { p: match.p4, r: r4 }].map(({ p, r }) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className={`font-poppins text-xs font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${!team1Won ? 'bg-orange/15 text-orange/90' : 'bg-white/5 text-white/30'}`}>{r}</span>
                    <Link href={`/match-iq/${p.id}`} className={`font-poppins text-sm font-medium hover:underline leading-tight break-words ${!team1Won ? 'text-white' : 'text-white/40'}`}>{p.name}</Link>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-white/5 px-4 sm:px-5 py-2.5 flex items-center justify-between gap-2">
              <p className="font-poppins text-white/25 text-xs">
                {new Date(match.played_on).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                {match.court && <> · Box {match.court}</>}{match.start_time && <> · {formatTime(match.start_time)}</>}
              </p>
              {isUpset && <span className="font-poppins text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-0.5 tracking-widest uppercase shrink-0">Upset</span>}
            </div>
          </div>
        )
      }} />
    </div>
  )
}
