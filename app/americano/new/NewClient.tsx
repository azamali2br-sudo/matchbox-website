'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { getTodayStr } from '@/lib/constants'
import { POINTS_OPTIONS, MIN_PLAYERS, MAX_PLAYERS, MAX_COURTS, MAX_NAME_LEN, MAX_PLAYER_NAME_LEN } from '@/lib/americano'

const inputCls = 'w-full font-poppins text-sm text-white placeholder-white/30 bg-navy-card border border-white/8 rounded-xl px-4 py-3 outline-none focus:border-orange/40'
const labelCls = 'font-poppins text-white/50 text-xs uppercase tracking-wider block mb-2'

export default function NewClient() {
  const [name, setName] = useState('')
  const [playedOn, setPlayedOn] = useState(getTodayStr())
  const [format, setFormat] = useState<'americano' | 'mexicano'>('americano')
  const [points, setPoints] = useState(21)
  const [courts, setCourts] = useState(2)
  const [playersText, setPlayersText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ id: string; organizerToken: string } | null>(null)

  const players = useMemo(
    () => playersText.split('\n').map(s => s.trim().replace(/\s+/g, ' ')).filter(Boolean),
    [playersText],
  )
  const sitOutsPerRound = Math.max(0, players.length - Math.min(courts, Math.floor(players.length / 4)) * 4)

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/americano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, playedOn, format, pointsPerMatch: points, courts, players }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      setCreated(data)
    } catch {
      setError('Network error — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (created) {
    const base = typeof window !== 'undefined' ? window.location.origin : ''
    const publicUrl = `${base}/americano/${created.id}`
    const manageUrl = `${base}/americano/${created.id}/manage/${created.organizerToken}`
    return (
      <div className="min-h-screen bg-navy pt-28">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
          <h1 className="font-qaranta text-4xl sm:text-5xl text-white uppercase leading-none mb-3">
            You&apos;re <span className="text-orange">On</span>
          </h1>
          <p className="font-poppins text-white/50 text-sm mb-8">
            Round 1 is drawn. Two links matter now — one to share, one to keep.
          </p>

          <ShareCard
            title="Standings link — share with all players"
            desc="Anyone with this link can watch live standings and round results."
            url={publicUrl}
          />
          <ShareCard
            title="Organizer link — KEEP THIS PRIVATE"
            desc="This is your only key to enter scores and run rounds. It can't be recovered if lost — save it before you close this page."
            url={manageUrl}
            warn
          />

          <a href={manageUrl}
            className="mt-4 inline-flex items-center justify-center w-full bg-orange hover:bg-orange-dark text-white font-poppins font-semibold text-sm px-8 py-4 rounded-full transition-all duration-200">
            Open organizer view
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy pt-28">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="mb-8">
          <h1 className="font-qaranta text-4xl sm:text-5xl md:text-6xl text-white uppercase leading-none mb-4">
            Run an <span className="text-orange">Americano</span>
          </h1>
          <p className="font-poppins text-white/50 text-sm max-w-lg leading-relaxed">
            Free tournament organizer by Matchbox. Enter your players, and we handle the rest — round draws,
            rotating partners, live standings. No account needed. Works at any court, anywhere.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className={labelCls}>Tournament name</label>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={MAX_NAME_LEN}
              placeholder="Sunday Night Americano" className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={playedOn} onChange={e => setPlayedOn(e.target.value)}
                className={`${inputCls} [color-scheme:dark]`} />
            </div>
            <div>
              <label className={labelCls}>Courts available</label>
              <div className="flex items-center gap-1 bg-navy-card border border-white/8 rounded-xl p-1">
                {Array.from({ length: MAX_COURTS }, (_, i) => i + 1).map(c => (
                  <button key={c} onClick={() => setCourts(c)}
                    className={`flex-1 font-poppins text-sm font-semibold py-2 rounded-lg transition-all ${courts === c ? 'bg-orange text-white' : 'text-white/40 hover:text-white/70'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Format</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                { key: 'americano', title: 'Americano', desc: 'Partners rotate every round — everyone plays with everyone. The social classic.' },
                { key: 'mexicano', title: 'Mexicano', desc: 'Rounds are drawn from live standings — top players meet top players. Gets competitive fast.' },
              ] as const).map(f => (
                <button key={f.key} onClick={() => setFormat(f.key)}
                  className={`text-left rounded-2xl border p-4 transition-colors ${format === f.key ? 'border-orange/50 bg-orange/8' : 'border-white/8 bg-navy-card hover:border-white/20'}`}>
                  <p className={`font-poppins text-sm font-semibold ${format === f.key ? 'text-orange' : 'text-white'}`}>{f.title}</p>
                  <p className="font-poppins text-white/40 text-xs mt-1 leading-relaxed">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Points per match</label>
            <div className="flex items-center gap-1 bg-navy-card border border-white/8 rounded-xl p-1 w-fit">
              {POINTS_OPTIONS.map(p => (
                <button key={p} onClick={() => setPoints(p)}
                  className={`font-poppins text-sm font-semibold px-5 py-2 rounded-lg transition-all ${points === p ? 'bg-orange text-white' : 'text-white/40 hover:text-white/70'}`}>
                  {p}
                </button>
              ))}
            </div>
            <p className="font-poppins text-white/30 text-xs mt-2">
              Each match is played to a fixed {points} points — both teams keep the points they score.
            </p>
          </div>

          <div>
            <label className={labelCls}>
              Players <span className="normal-case tracking-normal">— one name per line ({players.length ? `${players.length} entered` : `${MIN_PLAYERS}–${MAX_PLAYERS}`})</span>
            </label>
            <textarea value={playersText} onChange={e => setPlayersText(e.target.value)} rows={8}
              placeholder={'Ali\nHamza\nSara\nBilal'}
              className={`${inputCls} resize-y leading-relaxed`} />
            {players.length >= MIN_PLAYERS && sitOutsPerRound > 0 && (
              <p className="font-poppins text-white/35 text-xs mt-2">
                {players.length} players on {Math.min(courts, Math.floor(players.length / 4))} {Math.min(courts, Math.floor(players.length / 4)) === 1 ? 'court' : 'courts'} —
                {' '}{sitOutsPerRound} {sitOutsPerRound === 1 ? 'player sits' : 'players sit'} out each round (rotated fairly).
              </p>
            )}
            {players.some(p => p.length > MAX_PLAYER_NAME_LEN) && (
              <p className="font-poppins text-red-400 text-xs mt-2">Player names are limited to {MAX_PLAYER_NAME_LEN} characters.</p>
            )}
          </div>

          {error && <p className="font-poppins text-red-400 text-sm">{error}</p>}

          <button onClick={submit}
            disabled={submitting || !name.trim() || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS}
            className="w-full bg-orange hover:bg-orange-dark disabled:opacity-40 disabled:hover:bg-orange text-white font-poppins font-semibold text-sm px-8 py-4 rounded-full transition-all duration-200">
            {submitting ? 'Drawing round 1…' : 'Create tournament'}
          </button>
          <p className="font-poppins text-white/25 text-xs text-center">
            By creating a tournament you agree to our <Link href="/terms" className="underline hover:text-white/50">Terms</Link>. Keep it clean — this page carries your names.
          </p>
        </div>
      </div>
    </div>
  )
}

function ShareCard({ title, desc, url, warn }: { title: string; desc: string; url: string; warn?: boolean }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable — the URL is visible to copy manually */ }
  }
  return (
    <div className={`rounded-2xl border p-5 mb-4 ${warn ? 'border-orange/30 bg-orange/5' : 'border-white/8 bg-navy-card'}`}>
      <p className={`font-poppins text-xs font-semibold uppercase tracking-wider mb-1 ${warn ? 'text-orange' : 'text-white/60'}`}>{title}</p>
      <p className="font-poppins text-white/40 text-xs leading-relaxed mb-3">{desc}</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 font-mono text-[11px] text-white/70 bg-navy border border-white/10 rounded-lg px-3 py-2.5 truncate">{url}</code>
        <button onClick={copy}
          className="shrink-0 font-poppins text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg px-4 py-2.5 transition-colors">
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}
