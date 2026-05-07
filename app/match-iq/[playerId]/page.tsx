'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

type Player = { id: string; name: string; rating: number; wins: number; losses: number; created_at: string }
type RatingPoint = { rating: number; created_at: string }
type MatchPlayer = { id: string; name: string; rating: number }
type SetScore = { t1: number; t2: number }
type Match = {
  id: string
  played_on: string
  team1_score: number
  team2_score: number
  set_scores: SetScore[] | null
  p1: MatchPlayer; p2: MatchPlayer; p3: MatchPlayer; p4: MatchPlayer
}

export default function PlayerPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = use(params)
  const [player, setPlayer] = useState<Player | null>(null)
  const [history, setHistory] = useState<RatingPoint[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/match-iq/players/${playerId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setNotFound(true); return }
        setPlayer(data.player)
        setHistory(data.ratingHistory)
        setMatches(data.matches)
      })
      .finally(() => setLoading(false))
  }, [playerId])

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center pt-20">
        <div className="space-y-4 w-full max-w-2xl px-6">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-navy-card rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (notFound || !player) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center pt-20">
        <div className="text-center">
          <p className="font-qaranta text-4xl text-white/20 uppercase mb-4">Player Not Found</p>
          <Link href="/match-iq" className="font-poppins text-orange text-sm hover:underline">← Back to leaderboard</Link>
        </div>
      </div>
    )
  }

  const matches_played = player.wins + player.losses
  const winRate = matches_played > 0 ? Math.round((player.wins / matches_played) * 100) : 0

  return (
    <div className="min-h-screen bg-navy pt-20">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/match-iq" className="inline-flex items-center gap-2 font-poppins text-white/40 text-sm hover:text-white/70 transition-colors mb-8">
          ← Leaderboard
        </Link>

        {/* Player header */}
        <div className="bg-navy-card border border-white/8 rounded-3xl p-8 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-qaranta text-5xl text-white uppercase">{player.name}</h1>
              <p className="font-poppins text-white/40 text-sm mt-2">
                Member since {new Date(player.created_at).toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="font-qaranta text-6xl text-orange">{player.rating}</div>
              <div className="font-poppins text-white/40 text-xs uppercase tracking-widest mt-1">Rating</div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            {[
              { label: 'Wins', value: player.wins, color: 'text-green-400' },
              { label: 'Losses', value: player.losses, color: 'text-red-400' },
              { label: 'Win Rate', value: `${winRate}%`, color: 'text-orange' },
            ].map(s => (
              <div key={s.label} className="bg-navy rounded-xl p-4 text-center border border-white/5">
                <div className={`font-qaranta text-3xl ${s.color}`}>{s.value}</div>
                <div className="font-poppins text-white/35 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rating graph */}
        {history.length > 1 && (
          <div className="bg-navy-card border border-white/8 rounded-3xl p-8 mb-6">
            <h2 className="font-poppins text-white/50 text-xs uppercase tracking-widest mb-6">Rating History</h2>
            <RatingGraph points={history} />
          </div>
        )}

        {/* Match history */}
        {matches.length > 0 && (
          <div className="bg-navy-card border border-white/8 rounded-3xl p-8">
            <h2 className="font-poppins text-white/50 text-xs uppercase tracking-widest mb-6">Match History</h2>
            <div className="space-y-3">
              {matches.map(match => {
                const onTeam1 = [match.p1.id, match.p2.id].includes(playerId)
                const team1Won = match.team1_score > match.team2_score
                const won = onTeam1 ? team1Won : !team1Won
                const myTeam = onTeam1 ? [match.p1, match.p2] : [match.p3, match.p4]
                const oppTeam = onTeam1 ? [match.p3, match.p4] : [match.p1, match.p2]
                const myScore = onTeam1 ? match.team1_score : match.team2_score
                const oppScore = onTeam1 ? match.team2_score : match.team1_score

                return (
                  <div key={match.id} className="flex items-center gap-4 py-3 border-b border-white/5 last:border-0">
                    <span className={`font-poppins text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 ${won ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {won ? 'W' : 'L'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-poppins text-white/70 text-sm truncate">
                        {myTeam.map(p => p.name).join(' & ')}
                        <span className="text-white/25 mx-2">vs</span>
                        {oppTeam.map(p => p.name).join(' & ')}
                      </p>
                      <p className="font-poppins text-white/30 text-xs mt-0.5">
                        {new Date(match.played_on).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-qaranta text-lg">
                        <span className={won ? 'text-orange' : 'text-white/30'}>{myScore}</span>
                        <span className="text-white/20 mx-1">–</span>
                        <span className={!won ? 'text-orange' : 'text-white/30'}>{oppScore}</span>
                      </div>
                      {match.set_scores && (
                        <p className="font-poppins text-white/25 text-xs mt-0.5">
                          {match.set_scores.map((s, i) => {
                            const t1 = onTeam1 ? s.t1 : s.t2
                            const t2 = onTeam1 ? s.t2 : s.t1
                            return <span key={i}>{i > 0 && ', '}{t1}–{t2}</span>
                          })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RatingGraph({ points }: { points: RatingPoint[] }) {
  const ratings = points.map(p => p.rating)
  const min = Math.max(0, Math.min(...ratings) - 5)
  const max = Math.min(95, Math.max(...ratings) + 5)
  const range = max - min || 10
  const W = 600
  const H = 120
  const PAD = 10

  const toX = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2)
  const toY = (r: number) => H - PAD - ((r - min) / range) * (H - PAD * 2)

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(p.rating)}`).join(' ')
  const areaD = `${pathD} L ${toX(points.length - 1)} ${H} L ${toX(0)} ${H} Z`

  const last = points[points.length - 1].rating
  const first = points[0].rating
  const trending = last >= first

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
        <defs>
          <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F68E3B" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#F68E3B" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#rg)" />
        <path d={pathD} fill="none" stroke={trending ? '#F68E3B' : '#F68E3B'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={toX(i)} cy={toY(p.rating)} r="3" fill="#F68E3B" />
        ))}
      </svg>
      <div className="flex justify-between mt-2">
        <span className="font-poppins text-white/25 text-xs">{new Date(points[0].created_at).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}</span>
        <span className="font-poppins text-white/25 text-xs">{new Date(points[points.length - 1].created_at).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  )
}
