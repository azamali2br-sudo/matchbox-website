'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatTime } from '@/lib/constants'

type Player = {
  id: string
  name: string
  rating: number
  wins: number
  losses: number
}

type MatchPlayer = { id: string; name: string; rating: number }
type SetScore = { t1: number; t2: number }
type Match = {
  id: string
  played_on: string
  court: string | null
  start_time: string | null
  team1_score: number
  team2_score: number
  set_scores: SetScore[] | null
  p1: MatchPlayer
  p2: MatchPlayer
  p3: MatchPlayer
  p4: MatchPlayer
}

export default function MatchIQClient() {
  const [tab, setTab] = useState<'leaderboard' | 'matches'>('leaderboard')
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [matchRatings, setMatchRatings] = useState<Record<string, Record<string, number>>>({})
  const [totalMatches, setTotalMatches] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [pr, mr] = await Promise.all([
        fetch('/api/match-iq/players').then(r => r.json()),
        fetch('/api/match-iq/matches?limit=15').then(r => r.json()),
      ])
      setPlayers(pr.players ?? [])
      setMatches(mr.matches ?? [])
      setMatchRatings(mr.matchRatings ?? {})
      setTotalMatches(mr.total ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-navy pt-24">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-6">
          <div className="inline-flex items-center gap-2 bg-orange/10 border border-orange/25 rounded-full px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-orange animate-pulse" />
            <span className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest">Live Rankings</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <h1 className="font-qaranta text-6xl md:text-7xl text-white uppercase leading-none">
              Match<span className="text-orange">IQ</span>
            </h1>
            <p className="font-poppins text-white/50 text-sm mt-3 max-w-md">
              Pakistan&apos;s first padel Elo rating system. Everyone starts at 60 — where you end up is up to you.
            </p>
          </div>
          <Link
            href="/match-iq/submit"
            className="inline-flex items-center gap-2 bg-orange hover:bg-orange-dark text-white font-poppins font-semibold text-sm px-6 py-3.5 rounded-full transition-all duration-200 hover:shadow-xl hover:shadow-orange/30 shrink-0"
          >
            + Submit Match
          </Link>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Players', value: players.length || '—' },
            { label: 'Matches Played', value: totalMatches || '—' },
            { label: 'Starting Rating', value: 60 },
          ].map(s => (
            <div key={s.label} className="bg-navy-card border border-white/8 rounded-2xl p-5">
              <div className="font-qaranta text-3xl text-orange">{s.value}</div>
              <div className="font-poppins text-white/40 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-navy-card border border-white/8 rounded-xl p-1 w-fit mb-8">
          {(['leaderboard', 'matches'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`font-poppins text-xs font-semibold px-5 py-2.5 rounded-lg transition-all capitalize ${
                tab === t ? 'bg-orange text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t === 'leaderboard' ? 'Leaderboard' : 'Recent Matches'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-navy-card rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : tab === 'leaderboard' ? (
          <Leaderboard players={players} />
        ) : (
          <RecentMatches matches={matches} matchRatings={matchRatings} />
        )}
      </div>
    </div>
  )
}

function Leaderboard({ players }: { players: Player[] }) {
  if (players.length === 0) {
    return (
      <div className="text-center py-24">
        <p className="font-qaranta text-4xl text-white/20 uppercase mb-3">No Players Yet</p>
        <p className="font-poppins text-white/30 text-sm">Submit your first match to appear on the leaderboard.</p>
        <Link href="/match-iq/submit" className="inline-block mt-6 text-orange font-poppins text-sm font-semibold hover:underline">
          Submit a match →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="grid grid-cols-[2rem_1fr_5rem_5rem_4rem] gap-4 px-5 pb-2">
        <div />
        <span className="font-poppins text-white/30 text-xs uppercase tracking-wider">Player</span>
        <span className="font-poppins text-white/30 text-xs uppercase tracking-wider text-right">Rating</span>
        <span className="font-poppins text-white/30 text-xs uppercase tracking-wider text-center">W / L</span>
        <span className="font-poppins text-white/30 text-xs uppercase tracking-wider text-right">Win%</span>
      </div>

      {players.map((player, i) => {
        const rank = i + 1
        const rankColor = rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-amber-600' : 'text-white/25'
        const borderColor = rank === 1 ? 'border-yellow-400/20' : rank <= 3 ? 'border-orange/15' : 'border-white/6'
        const matchesPlayed = player.wins + player.losses
        const winRate = matchesPlayed > 0 ? Math.round((player.wins / matchesPlayed) * 100) : null

        return (
          <Link
            key={player.id}
            href={`/match-iq/${player.id}`}
            className={`grid grid-cols-[2rem_1fr_5rem_5rem_4rem] gap-4 items-center bg-navy-card border ${borderColor} rounded-2xl px-5 py-4 hover:border-orange/30 transition-all group`}
          >
            <span className={`font-qaranta text-lg ${rankColor}`}>{rank}</span>
            <div>
              <p className="font-poppins text-white text-sm font-semibold group-hover:text-orange transition-colors">{player.name}</p>
            </div>
            <p className="font-qaranta text-xl text-orange text-right">{Math.round(player.rating)}</p>
            <p className="font-poppins text-white/50 text-xs text-center">
              <span className="text-green-400">{player.wins}</span>
              <span className="text-white/20 mx-1">/</span>
              <span className="text-red-400/70">{player.losses}</span>
            </p>
            <p className="font-poppins text-white/40 text-xs text-right">
              {winRate !== null ? `${winRate}%` : '—'}
            </p>
          </Link>
        )
      })}
    </div>
  )
}

function RecentMatches({ matches, matchRatings }: { matches: Match[]; matchRatings: Record<string, Record<string, number>> }) {
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

        const avg1 = Math.round((r1 + r2) / 2)
        const avg2 = Math.round((r3 + r4) / 2)
        const ratingGap = Math.abs(avg1 - avg2)
        const isUpset = (team1Won && avg1 < avg2) || (!team1Won && avg2 < avg1)

        const winnerBorder = team1Won ? 'border-l-orange/40' : 'border-r-orange/40'

        return (
          <div key={match.id} className={`bg-navy-card border border-white/6 rounded-2xl overflow-hidden hover:border-white/15 transition-colors border-l-2 border-r-2 ${winnerBorder}`}>

            {/* Main content */}
            <div className="flex items-center gap-3 px-5 py-5">

              {/* Team 1 — right aligned */}
              <div className="flex-1 text-right space-y-2.5">
                {[{ p: match.p1, r: r1 }, { p: match.p2, r: r2 }].map(({ p, r }) => (
                  <div key={p.id} className="flex items-center justify-end gap-2">
                    <Link
                      href={`/match-iq/${p.id}`}
                      className={`font-poppins text-sm font-medium hover:underline transition-colors leading-tight ${team1Won ? 'text-white' : 'text-white/40'}`}
                    >
                      {p.name}
                    </Link>
                    <span className={`font-poppins text-xs font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${
                      team1Won ? 'bg-orange/15 text-orange/90' : 'bg-white/5 text-white/30'
                    }`}>
                      {r}
                    </span>
                  </div>
                ))}
              </div>

              {/* Score */}
              <div className="shrink-0 text-center w-28">
                {ratingGap >= 5 && (
                  <p className="font-poppins text-white/20 text-xs mb-1.5 tracking-wide">
                    {avg1} <span className="text-white/10 mx-0.5">·</span> {avg2}
                  </p>
                )}
                <div className="flex items-center justify-center gap-2.5">
                  <span className={`font-qaranta text-4xl leading-none ${team1Won ? 'text-orange' : 'text-white/25'}`}>{match.team1_score}</span>
                  <span className="font-poppins text-white/15 text-base">–</span>
                  <span className={`font-qaranta text-4xl leading-none ${!team1Won ? 'text-orange' : 'text-white/25'}`}>{match.team2_score}</span>
                </div>
                {match.set_scores && (
                  <p className="font-poppins text-white/20 text-xs mt-1.5">
                    {match.set_scores.map(s => `${s.t1}–${s.t2}`).join(', ')}
                  </p>
                )}
              </div>

              {/* Team 2 — left aligned */}
              <div className="flex-1 space-y-2.5">
                {[{ p: match.p3, r: r3 }, { p: match.p4, r: r4 }].map(({ p, r }) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className={`font-poppins text-xs font-semibold px-1.5 py-0.5 rounded-md shrink-0 ${
                      !team1Won ? 'bg-orange/15 text-orange/90' : 'bg-white/5 text-white/30'
                    }`}>
                      {r}
                    </span>
                    <Link
                      href={`/match-iq/${p.id}`}
                      className={`font-poppins text-sm font-medium hover:underline transition-colors leading-tight ${!team1Won ? 'text-white' : 'text-white/40'}`}
                    >
                      {p.name}
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-white/5 px-5 py-2.5 flex items-center justify-between">
              <p className="font-poppins text-white/25 text-xs">
                {new Date(match.played_on).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                {match.court && <> · Box {match.court}</>}
                {match.start_time && <> · {formatTime(match.start_time)}</>}
              </p>
              {isUpset && (
                <span className="font-poppins text-xs font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-2.5 py-0.5 tracking-widest uppercase">
                  Upset
                </span>
              )}
            </div>

          </div>
        )
      })}
    </div>
  )
}
