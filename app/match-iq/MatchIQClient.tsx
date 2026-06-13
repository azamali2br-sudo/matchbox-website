'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { formatTime } from '@/lib/constants'
import { BADGE_DEFS, BADGE_TILE, BADGE_TEXT, sortBadges, type BadgeKey } from '@/lib/badges'

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
  rank: number | null
  badges: BadgeKey[]
}

type MonthOpt = { value: string; label: string; closed?: boolean }
type ApiResp = {
  view: 'month' | 'all'
  month: string | null
  monthLabel: string
  availableMonths: MonthOpt[]
  closed?: boolean
  mainDraw: Player[]
  qualifying: Player[]
  totalMatches: number
  totalPlayers: number
}

type MatchPlayer = { id: string; name: string; rating: number }
type SetScore = { t1: number; t2: number }
type Match = {
  id: string; played_on: string; court: string | null; start_time: string | null
  team1_score: number; team2_score: number; set_scores: SetScore[] | null
  p1: MatchPlayer; p2: MatchPlayer; p3: MatchPlayer; p4: MatchPlayer
}

// ── Badges ──────────────────────────────────────────────────────────────────
// The highest-priority badge a player holds (drives the row tint + caption).
function topBadge(keys: BadgeKey[]) {
  if (!keys.length) return null
  return BADGE_DEFS[sortBadges(keys)[0]]
}

// One subdued caption naming the player's achievement(s) — readable, unlike a
// row of look-alike emoji shields. Colour ties back to the row's tile tint.
function AchievementLine({ keys }: { keys: BadgeKey[] }) {
  const top = topBadge(keys)
  if (!top) return null
  const labels = sortBadges(keys).map(k => BADGE_DEFS[k].label).join(' · ')
  return (
    <span className={`font-poppins text-[11px] font-semibold tracking-wide inline-flex items-center gap-1.5 min-w-0 ${BADGE_TEXT[top.tone]}`}>
      <span className="text-xs leading-none shrink-0">{top.icon}</span>
      <span className="truncate">{labels}</span>
    </span>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function MatchIQClient() {
  const [tab, setTab] = useState<'leaderboard' | 'matches'>('leaderboard')
  const [view, setView] = useState<'month' | 'all'>('month')
  const [month, setMonth] = useState<string | null>(null) // null = latest
  const [data, setData] = useState<ApiResp | null>(null)
  const [loading, setLoading] = useState(true)

  const [matches, setMatches] = useState<Match[]>([])
  const [matchRatings, setMatchRatings] = useState<Record<string, Record<string, number>>>({})
  const [totalAllMatches, setTotalAllMatches] = useState(0)

  useEffect(() => {
    setLoading(true)
    const qs = view === 'all' ? 'view=all' : `view=month${month ? `&month=${month}` : ''}`
    fetch(`/api/match-iq/players?${qs}`)
      .then(r => r.json())
      .then((d: ApiResp) => setData(d))
      .finally(() => setLoading(false))
  }, [view, month])

  // Recent Matches follows the selected period: all-time shows the latest
  // across every season; a month view scopes to that month (resolved from the
  // leaderboard response so "latest" lands on the right month).
  const resolvedMonth = data?.month ?? null
  useEffect(() => {
    const qs = view === 'all' || !resolvedMonth ? 'limit=15' : `limit=50&month=${resolvedMonth}`
    fetch(`/api/match-iq/matches?${qs}`)
      .then(r => r.json())
      .then(d => { setMatches(d.matches ?? []); setMatchRatings(d.matchRatings ?? {}); setTotalAllMatches(d.total ?? 0) })
  }, [view, resolvedMonth])

  return (
    <div className="min-h-screen bg-navy pt-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Hero */}
        <div className="flex items-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 bg-orange/10 border border-orange/25 rounded-full px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-orange animate-pulse" />
            <span className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest">Live Rankings</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <h1 className="font-qaranta text-5xl sm:text-6xl md:text-7xl text-white uppercase leading-none">
              Match<span className="text-orange">IQ</span>
            </h1>
            <p className="font-poppins text-white/50 text-sm mt-3 max-w-md">
              Pakistan&apos;s first padel Elo rating system. Every month resets to 60 — climb the board and earn your badges.
            </p>
          </div>
          <Link href="/match-iq/submit"
            className="inline-flex items-center gap-2 bg-orange hover:bg-orange-dark text-white font-poppins font-semibold text-sm px-6 py-3.5 rounded-full transition-all duration-200 hover:shadow-xl hover:shadow-orange/30 shrink-0">
            + Submit Match
          </Link>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-10">
          {[
            { label: data?.view === 'all' ? 'Players (all-time)' : 'Players this month', value: data?.totalPlayers || '—' },
            { label: data?.view === 'all' ? 'Matches (all-time)' : 'Matches this month', value: data?.totalMatches || '—' },
            { label: 'Starting Rating', value: 60 },
          ].map(s => (
            <div key={s.label} className="bg-navy-card border border-white/8 rounded-2xl px-3 py-4 sm:p-5">
              <div className="font-qaranta text-2xl sm:text-3xl text-orange leading-none">{s.value}</div>
              <div className="font-poppins text-white/40 text-[11px] sm:text-xs mt-1.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-navy-card border border-white/8 rounded-xl p-1 w-fit mb-8">
          {(['leaderboard', 'matches'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`font-poppins text-xs font-semibold px-5 py-2.5 rounded-lg transition-all ${tab === t ? 'bg-orange text-white' : 'text-white/40 hover:text-white/70'}`}>
              {t === 'leaderboard' ? 'Leaderboard' : 'Recent Matches'}
            </button>
          ))}
        </div>

        {tab === 'leaderboard'
          ? <Leaderboard data={data} loading={loading} view={view} setView={setView} month={month} setMonth={setMonth} />
          : <RecentMatches matches={matches} matchRatings={matchRatings} total={totalAllMatches} />}
      </div>
    </div>
  )
}

// ── Leaderboard ──────────────────────────────────────────────────────────────
type SortCol = 'rating' | 'matches' | 'wins' | 'losses' | 'winRate' | 'avgOpp'

function Leaderboard({
  data, loading, view, setView, month, setMonth,
}: {
  data: ApiResp | null; loading: boolean
  view: 'month' | 'all'; setView: (v: 'month' | 'all') => void
  month: string | null; setMonth: (m: string | null) => void
}) {
  const [draw, setDraw] = useState<'main' | 'qualifying'>('main')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ col: SortCol; dir: 'asc' | 'desc' }>({ col: 'rating', dir: 'desc' })

  const activeMonth = data?.month ?? month

  const shown = useMemo(() => {
    const list = draw === 'main' ? (data?.mainDraw ?? []) : (data?.qualifying ?? [])
    const q = search.trim().toLowerCase()
    const filtered = q ? list.filter(p => p.name.toLowerCase().includes(q)) : list
    const { col, dir } = sort
    const m = dir === 'desc' ? -1 : 1
    const val = (p: Player) => col === 'winRate' ? (p.winRate ?? -1) : col === 'avgOpp' ? (p.avgOpp ?? -1) : p[col]
    return [...filtered].sort((a, b) => (val(a) - val(b)) * m || a.name.localeCompare(b.name))
  }, [data, draw, search, sort])

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-navy-card rounded-2xl animate-pulse" />)}</div>
  }

  return (
    <div className="space-y-7">
      {/* Period controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-navy-card border border-white/8 rounded-xl p-1">
          {(['month', 'all'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`font-poppins text-xs font-semibold px-4 py-2 rounded-lg transition-all ${view === v ? 'bg-orange text-white' : 'text-white/40 hover:text-white/70'}`}>
              {v === 'month' ? 'Monthly' : 'All-Time'}
            </button>
          ))}
        </div>
        {view === 'month' && data && (
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
        {view === 'month' && data?.closed && (
          <span className="font-poppins text-[10px] font-semibold uppercase tracking-wide text-green-400 border border-green-500/30 bg-green-500/10 rounded-full px-2.5 py-1">
            ✓ Final
          </span>
        )}
        {view === 'month' && activeMonth && (
          <Link href={`/match-iq/season/${activeMonth}`}
            className="font-poppins text-[11px] font-semibold text-orange/80 hover:text-orange border border-orange/25 hover:border-orange/50 rounded-full px-3 py-1.5">
            Season recap ↗
          </Link>
        )}
        <p className="font-poppins text-white/30 text-xs ml-auto">
          {view === 'all' ? 'Career ratings, all matches' : data?.closed ? 'Final standings — season closed' : 'Resets to 60 each month'}
        </p>
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
          Played fewer than 3 matches {view === 'all' ? '' : 'this month'} — keep playing to join the Main Draw.
        </p>
      )}

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
        <LeaderTable players={shown} provisional={draw === 'qualifying'} sort={sort} setSort={setSort} />
      )}
    </div>
  )
}

// ── Sortable table ───────────────────────────────────────────────────────────
function LeaderTable({
  players, provisional, sort, setSort,
}: {
  players: Player[]; provisional: boolean
  sort: { col: SortCol; dir: 'asc' | 'desc' }; setSort: (s: { col: SortCol; dir: 'asc' | 'desc' }) => void
}) {
  const toggle = (col: SortCol) => setSort(sort.col === col ? { col, dir: sort.dir === 'desc' ? 'asc' : 'desc' } : { col, dir: 'desc' })
  const caret = (col: SortCol) => sort.col === col ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''
  const cols: { key: SortCol; label: string; align: string }[] = [
    { key: 'rating', label: 'Rating', align: 'text-right' },
    { key: 'matches', label: 'M', align: 'text-center' },
    { key: 'wins', label: 'W/L', align: 'text-center' },
    { key: 'winRate', label: 'Win%', align: 'text-right' },
    { key: 'avgOpp', label: 'Avg Opp', align: 'text-right' },
  ]

  return (
    <div className="space-y-2">
      {/* Mobile sort control */}
      <div className="sm:hidden flex items-center gap-2 mb-1">
        <span className="font-poppins text-white/30 text-[11px] uppercase tracking-wider">Sort</span>
        <div className="flex flex-wrap gap-1">
          {cols.map(c => (
            <button key={c.key} onClick={() => toggle(c.key)}
              className={`font-poppins text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${sort.col === c.key ? 'border-orange/40 text-orange bg-orange/10' : 'border-white/8 text-white/40'}`}>
              {c.label}{caret(c.key)}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden sm:grid grid-cols-[2.5rem_1fr_5rem_3.5rem_5rem_4.5rem_5rem] gap-3 px-5 pb-1">
        <div />
        <span className="font-poppins text-white/30 text-xs uppercase tracking-wider">Player</span>
        {cols.map(c => (
          <button key={c.key} onClick={() => toggle(c.key)}
            className={`font-poppins text-xs uppercase tracking-wider hover:text-white/70 transition-colors ${c.align} ${sort.col === c.key ? 'text-orange' : 'text-white/30'}`}>
            {c.label}{caret(c.key)}
          </button>
        ))}
      </div>

      {players.map(player => {
        const rank = player.rank
        const rankColor = provisional ? 'text-white/30'
          : rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-amber-600' : 'text-white/30'
        const borderColor = provisional ? 'border-white/5'
          : rank === 1 ? 'border-yellow-400/20' : rank && rank <= 3 ? 'border-orange/15' : 'border-white/6'

        // Badge-holders get a subtle on-theme tile tint + coloured left accent,
        // keyed to their top badge. Everyone else stays the plain card.
        const top = provisional ? null : topBadge(player.badges)
        const tile = top ? `bg-gradient-to-r to-transparent border-l-2 ${BADGE_TILE[top.tone]}` : ''

        return (
          <Link key={player.id} href={`/match-iq/${player.id}`}
            className={`block bg-navy-card ${tile} border ${borderColor} rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 hover:border-orange/30 transition-all group`}>
            {/* Mobile */}
            <div className="sm:hidden flex items-start gap-3">
              <span className={`font-qaranta text-lg leading-none w-7 shrink-0 text-center mt-0.5 ${rankColor}`}>{rank ?? '—'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-poppins text-white text-sm font-semibold break-words leading-snug group-hover:text-orange transition-colors">{player.name}</p>
                {top && <div className="mt-1"><AchievementLine keys={player.badges} /></div>}
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
            <div className="hidden sm:grid grid-cols-[2.5rem_1fr_5rem_3.5rem_5rem_4.5rem_5rem] gap-3 items-center">
              <span className={`font-qaranta text-lg leading-none text-center ${rankColor}`}>{rank ?? '—'}</span>
              <div className="flex flex-col justify-center gap-0.5 min-w-0">
                <p className="font-poppins text-white text-sm font-semibold group-hover:text-orange transition-colors truncate">{player.name}</p>
                {top && <AchievementLine keys={player.badges} />}
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
      })}
    </div>
  )
}

// ── Recent matches (unchanged) ───────────────────────────────────────────────
function RecentMatches({ matches, matchRatings }: { matches: Match[]; matchRatings: Record<string, Record<string, number>>; total: number }) {
  if (matches.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="font-qaranta text-4xl text-white/20 uppercase mb-3">No Matches Yet</p>
        <p className="font-poppins text-white/30 text-sm">Approved matches will appear here.</p>
      </div>
    )
  }
  return (
    <div className="space-y-3">
      {matches.map(match => {
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
      })}
    </div>
  )
}
