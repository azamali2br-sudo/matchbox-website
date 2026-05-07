'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Player = {
  id: string
  name: string
  rating: number
  wins: number
  losses: number
}

type MatchPlayer = { id: string; name: string; rating: number }
type Match = {
  id: string
  played_on: string
  team1_score: number
  team2_score: number
  p1: MatchPlayer
  p2: MatchPlayer
  p3: MatchPlayer
  p4: MatchPlayer
}

export default function MatchIQClient() {
  const [tab, setTab] = useState<'leaderboard' | 'matches'>('leaderboard')
  const [players, setPlayers] = useState<Player[]>([])
  const [matches, setMatches] = useState<Match[]>([])
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
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="min-h-screen bg-navy pt-20">
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
            { label: 'Matches Played', value: matches.length || '—' },
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
          <RecentMatches matches={matches} />
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
      <div className="grid grid-cols-[2rem_1fr_5rem_5rem_5rem] gap-4 px-5 pb-2">
        <div />
        <span className="font-poppins text-white/30 text-xs uppercase tracking-wider">Player</span>
        <span className="font-poppins text-white/30 text-xs uppercase tracking-wider text-right">Rating</span>
        <span className="font-poppins text-white/30 text-xs uppercase tracking-wider text-center">W / L</span>
        <span className="font-poppins text-white/30 text-xs uppercase tracking-wider text-right">Matches</span>
      </div>

      {players.map((player, i) => {
        const rank = i + 1
        const rankColor = rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-slate-300' : rank === 3 ? 'text-amber-600' : 'text-white/25'
        const borderColor = rank === 1 ? 'border-yellow-400/20' : rank <= 3 ? 'border-orange/15' : 'border-white/6'

        return (
          <Link
            key={player.id}
            href={`/match-iq/${player.id}`}
            className={`grid grid-cols-[2rem_1fr_5rem_5rem_5rem] gap-4 items-center bg-navy-card border ${borderColor} rounded-2xl px-5 py-4 hover:border-orange/30 transition-all group`}
          >
            <span className={`font-qaranta text-lg ${rankColor}`}>{rank}</span>
            <div>
              <p className="font-poppins text-white text-sm font-semibold group-hover:text-orange transition-colors">{player.name}</p>
            </div>
            <p className="font-qaranta text-xl text-orange text-right">{player.rating}</p>
            <p className="font-poppins text-white/50 text-xs text-center">
              <span className="text-green-400">{player.wins}</span>
              <span className="text-white/20 mx-1">/</span>
              <span className="text-red-400/70">{player.losses}</span>
            </p>
            <p className="font-poppins text-white/40 text-xs text-right">{player.wins + player.losses}</p>
          </Link>
        )
      })}
    </div>
  )
}

function RecentMatches({ matches }: { matches: Match[] }) {
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
        return (
          <div key={match.id} className="bg-navy-card border border-white/6 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-4">
              {/* Team 1 */}
              <div className="flex-1 text-right">
                <div className="space-y-0.5">
                  <Link href={`/match-iq/${match.p1.id}`} className="block font-poppins text-sm text-white hover:text-orange transition-colors">{match.p1.name}</Link>
                  <Link href={`/match-iq/${match.p2.id}`} className="block font-poppins text-sm text-white hover:text-orange transition-colors">{match.p2.name}</Link>
                </div>
              </div>

              {/* Score */}
              <div className="text-center shrink-0">
                <div className="flex items-center gap-3">
                  <span className={`font-qaranta text-3xl ${team1Won ? 'text-orange' : 'text-white/30'}`}>{match.team1_score}</span>
                  <span className="font-poppins text-white/20 text-xs">vs</span>
                  <span className={`font-qaranta text-3xl ${!team1Won ? 'text-orange' : 'text-white/30'}`}>{match.team2_score}</span>
                </div>
                <p className="font-poppins text-white/25 text-xs mt-1">
                  {new Date(match.played_on).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                </p>
              </div>

              {/* Team 2 */}
              <div className="flex-1">
                <div className="space-y-0.5">
                  <Link href={`/match-iq/${match.p3.id}`} className="block font-poppins text-sm text-white hover:text-orange transition-colors">{match.p3.name}</Link>
                  <Link href={`/match-iq/${match.p4.id}`} className="block font-poppins text-sm text-white hover:text-orange transition-colors">{match.p4.name}</Link>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
