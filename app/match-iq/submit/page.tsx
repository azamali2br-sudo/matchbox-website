'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TIME_SLOTS, formatTime } from '@/lib/constants'

type PlayerSlot = { name: string; phone: string; known: boolean; lookingUp: boolean }
type SetScore = { t1: string; t2: string }

const emptySlot = (): PlayerSlot => ({ name: '', phone: '', known: false, lookingUp: false })

function setsPlayed(t1: number, t2: number): number {
  return t1 + t2
}

function isValidSetsScore(t1: string, t2: string): boolean {
  const a = parseInt(t1)
  const b = parseInt(t2)
  if (isNaN(a) || isNaN(b)) return false
  return (a === 2 && (b === 0 || b === 1)) || (b === 2 && (a === 0 || a === 1))
}

export default function SubmitMatchPage() {
  const [players, setPlayers] = useState<[PlayerSlot, PlayerSlot, PlayerSlot, PlayerSlot]>([
    emptySlot(), emptySlot(), emptySlot(), emptySlot(),
  ])
  const [court, setCourt] = useState<'A' | 'B' | ''>('')
  const [startTime, setStartTime] = useState('')
  const [team1Sets, setTeam1Sets] = useState('')
  const [team2Sets, setTeam2Sets] = useState('')
  const [showSetScores, setShowSetScores] = useState(false)
  const [setScores, setSetScores] = useState<SetScore[]>([])
  const [playedOn, setPlayedOn] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const validScore = isValidSetsScore(team1Sets, team2Sets)
  const totalSets = validScore ? setsPlayed(parseInt(team1Sets), parseInt(team2Sets)) : 0

  // Sync set score rows when total sets changes
  useEffect(() => {
    if (!validScore) {
      setShowSetScores(false)
      setSetScores([])
      return
    }
    setSetScores(prev => {
      const next: SetScore[] = []
      for (let i = 0; i < totalSets; i++) {
        next.push(prev[i] ?? { t1: '', t2: '' })
      }
      return next
    })
  }, [totalSets, validScore])

  function updateSlot(i: number, fields: Partial<PlayerSlot>) {
    setPlayers(prev => {
      const next = [...prev] as typeof prev
      next[i] = { ...next[i], ...fields }
      return next
    })
  }

  function updateSetScore(i: number, field: 't1' | 't2', value: string) {
    setSetScores(prev => {
      const next = [...prev]
      next[i] = { ...next[i], [field]: value }
      return next
    })
  }

  async function lookupPhone(i: number, phone: string) {
    if (phone.length < 7) return
    updateSlot(i, { lookingUp: true })
    try {
      const res = await fetch(`/api/match-iq/players?phone=${encodeURIComponent(phone)}`)
      const data = await res.json()
      if (data.player) {
        updateSlot(i, { name: data.player.name, known: true, lookingUp: false })
      } else {
        updateSlot(i, { known: false, lookingUp: false })
      }
    } catch {
      updateSlot(i, { lookingUp: false })
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    for (let i = 0; i < 4; i++) {
      if (!players[i].name.trim() || !players[i].phone.trim()) {
        setError(`Player ${i + 1} name and phone are required.`)
        return
      }
    }
    const phones = players.map(p => p.phone.trim())
    if (new Set(phones).size < 4) {
      setError('All 4 players must be different people. Duplicate phone number detected.')
      return
    }
    if (!court) {
      setError('Please select which court you played on.')
      return
    }
    if (!startTime) {
      setError('Please select the time slot you played.')
      return
    }
    if (!validScore) {
      setError('Score must be 2–0 or 2–1 (sets won, best of 3).')
      return
    }

    const parsedSetScores = showSetScores
      ? setScores.map(s => ({ t1: parseInt(s.t1) || 0, t2: parseInt(s.t2) || 0 }))
      : null

    setSubmitting(true)
    try {
      const res = await fetch('/api/match-iq/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playedOn,
          court,
          startTime,
          team1: [players[0], players[1]],
          team2: [players[2], players[3]],
          team1Score: parseInt(team1Sets),
          team2Score: parseInt(team2Sets),
          setScores: parsedSetScores,
          submittedBy: players[0].phone,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Submission failed.'); return }
      setSuccess(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setSuccess(false)
    setPlayers([emptySlot(), emptySlot(), emptySlot(), emptySlot()])
    setCourt('')
    setStartTime('')
    setTeam1Sets('')
    setTeam2Sets('')
    setShowSetScores(false)
    setSetScores([])
  }

  if (success) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center pt-28 px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-9 h-9 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-qaranta text-4xl text-white uppercase mb-4">Match Submitted</h2>
          <p className="font-poppins text-white/50 text-sm mb-2">
            Your match is pending admin approval. Ratings will update once confirmed.
          </p>
          <p className="font-poppins text-white/30 text-xs mb-10">Usually approved within a few hours.</p>
          <div className="flex flex-col gap-3">
            <Link href="/match-iq" className="inline-flex items-center justify-center bg-orange hover:bg-orange-dark text-white font-poppins font-semibold text-sm px-8 py-4 rounded-full transition-all">
              View Leaderboard
            </Link>
            <button onClick={reset} className="font-poppins text-white/40 text-sm hover:text-white/70 transition-colors">
              Submit Another Match
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy pt-28">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link href="/match-iq" className="inline-flex items-center gap-2 font-poppins text-white/40 text-sm hover:text-white/70 transition-colors mb-8">
          ← Match IQ
        </Link>

        <h1 className="font-qaranta text-5xl text-white uppercase mb-2">Submit <span className="text-orange">Match</span></h1>
        <p className="font-poppins text-white/40 text-sm mb-10">
          Enter all 4 players and the final score. Pending admin approval before ratings update.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Date + Court + Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-poppins text-white/50 text-xs uppercase tracking-widest block mb-2">Date Played</label>
              <input
                type="date"
                value={playedOn}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setPlayedOn(e.target.value)}
                className="w-full bg-navy-card border border-white/10 text-white font-poppins text-sm px-4 py-3 rounded-xl outline-none focus:border-orange/50 transition-colors"
              />
            </div>

            <div>
              <label className="font-poppins text-white/50 text-xs uppercase tracking-widest block mb-2">Court</label>
              <div className="flex gap-2 h-[46px]">
                {(['A', 'B'] as const).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCourt(c)}
                    className={`flex-1 rounded-xl font-poppins text-sm font-semibold border transition-all ${
                      court === c
                        ? 'bg-orange border-orange text-white'
                        : 'bg-navy-card border-white/10 text-white/40 hover:text-white/70 hover:border-white/20'
                    }`}
                  >
                    Box {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="font-poppins text-white/50 text-xs uppercase tracking-widest block mb-2">Start Time</label>
              <select
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-navy-card border border-white/10 text-white font-poppins text-sm px-4 py-3 rounded-xl outline-none focus:border-orange/50 transition-colors appearance-none"
              >
                <option value="" disabled>Select time</option>
                {TIME_SLOTS.map(t => (
                  <option key={t} value={t}>{formatTime(t)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Teams */}
          {(['Team 1', 'Team 2'] as const).map((teamLabel, teamIdx) => (
            <div key={teamLabel} className={`rounded-2xl border p-6 ${teamIdx === 0 ? 'border-orange/20 bg-orange/5' : 'border-white/8 bg-navy-card'}`}>
              <div className="flex items-center gap-2 mb-5">
                <span className={`w-2 h-2 rounded-full ${teamIdx === 0 ? 'bg-orange' : 'bg-white/30'}`} />
                <span className="font-poppins text-white/70 text-xs font-semibold uppercase tracking-widest">{teamLabel}</span>
              </div>
              <div className="space-y-4">
                {[0, 1].map(slotOffset => {
                  const i = teamIdx * 2 + slotOffset
                  const slot = players[i]
                  return (
                    <div key={i} className="grid grid-cols-2 gap-3">
                      <div className="relative">
                        <input
                          type="tel"
                          placeholder={`Player ${slotOffset + 1} phone`}
                          value={slot.phone}
                          onChange={e => updateSlot(i, { phone: e.target.value, known: false })}
                          onBlur={e => lookupPhone(i, e.target.value)}
                          className="w-full bg-navy border border-white/10 text-white font-poppins text-sm px-4 py-3 rounded-xl outline-none focus:border-orange/50 transition-colors placeholder:text-white/20"
                        />
                        {slot.lookingUp && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-orange/40 border-t-orange rounded-full animate-spin" />
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Full name"
                          value={slot.name}
                          readOnly={slot.known}
                          onChange={e => updateSlot(i, { name: e.target.value })}
                          className={`w-full border font-poppins text-sm px-4 py-3 rounded-xl outline-none transition-colors placeholder:text-white/20 ${
                            slot.known
                              ? 'bg-green-500/5 border-green-500/25 text-green-300 cursor-default'
                              : 'bg-navy border-white/10 text-white focus:border-orange/50'
                          }`}
                        />
                        {slot.known && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-xs">✓</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* Sets won */}
          <div className="bg-navy-card border border-white/8 rounded-2xl p-6">
            <label className="font-poppins text-white/50 text-xs uppercase tracking-widest block mb-1">Sets Won — Best of 3</label>
            <p className="font-poppins text-white/25 text-xs mb-5">Enter how many sets each team won. Valid scores: 2–0 or 2–1.</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="font-poppins text-orange text-xs mb-2">Team 1</p>
                <input
                  type="number"
                  min={0} max={2}
                  placeholder="0"
                  value={team1Sets}
                  onChange={e => setTeam1Sets(e.target.value)}
                  className="w-full bg-navy border border-white/10 text-white font-qaranta text-2xl sm:text-4xl text-center px-3 sm:px-4 py-3 sm:py-4 rounded-xl outline-none focus:border-orange/50 transition-colors placeholder:text-white/15"
                />
              </div>
              <div className="text-center mt-5">
                <span className="font-poppins text-white/20 text-lg">–</span>
              </div>
              <div className="flex-1">
                <p className="font-poppins text-white/40 text-xs mb-2">Team 2</p>
                <input
                  type="number"
                  min={0} max={2}
                  placeholder="0"
                  value={team2Sets}
                  onChange={e => setTeam2Sets(e.target.value)}
                  className="w-full bg-navy border border-white/10 text-white font-qaranta text-2xl sm:text-4xl text-center px-3 sm:px-4 py-3 sm:py-4 rounded-xl outline-none focus:border-orange/50 transition-colors placeholder:text-white/15"
                />
              </div>
            </div>

            {/* Set scores expander */}
            {validScore && (
              <div className="mt-5 border-t border-white/6 pt-5">
                {!showSetScores ? (
                  <button
                    type="button"
                    onClick={() => setShowSetScores(true)}
                    className="font-poppins text-orange/70 hover:text-orange text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <span className="text-base leading-none">+</span> Add set scores (optional)
                  </button>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="font-poppins text-white/40 text-xs uppercase tracking-widest">Set Scores</p>
                      <button
                        type="button"
                        onClick={() => setShowSetScores(false)}
                        className="font-poppins text-white/25 hover:text-white/50 text-xs transition-colors"
                      >
                        Remove ×
                      </button>
                    </div>
                    <div className="space-y-3">
                      {setScores.map((s, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <span className="font-poppins text-white/30 text-xs w-10">Set {i + 1}</span>
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="number"
                              min={0} max={7}
                              placeholder="0"
                              value={s.t1}
                              onChange={e => updateSetScore(i, 't1', e.target.value)}
                              className="flex-1 bg-navy border border-white/10 text-white font-qaranta text-2xl text-center px-3 py-2.5 rounded-xl outline-none focus:border-orange/50 transition-colors placeholder:text-white/15"
                            />
                            <span className="font-poppins text-white/20 text-sm">–</span>
                            <input
                              type="number"
                              min={0} max={7}
                              placeholder="0"
                              value={s.t2}
                              onChange={e => updateSetScore(i, 't2', e.target.value)}
                              className="flex-1 bg-navy border border-white/10 text-white font-qaranta text-2xl text-center px-3 py-2.5 rounded-xl outline-none focus:border-orange/50 transition-colors placeholder:text-white/15"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="font-poppins text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-orange hover:bg-orange-dark disabled:opacity-50 text-white font-poppins font-semibold text-sm py-4 rounded-full transition-all hover:shadow-xl hover:shadow-orange/30"
          >
            {submitting ? 'Submitting...' : 'Submit Match for Review'}
          </button>

          <p className="font-poppins text-white/25 text-xs text-center">
            New players are automatically registered on their first match.
          </p>
        </form>
      </div>
    </div>
  )
}
