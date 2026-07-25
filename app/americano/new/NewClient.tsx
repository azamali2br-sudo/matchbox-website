'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { getTodayStr } from '@/lib/constants'
import {
  POINTS_OPTIONS, MIN_PLAYERS, MAX_PLAYERS, MAX_COURTS, MAX_NAME_LEN, MAX_PLAYER_NAME_LEN,
  isTrueAmericanoCount, isEqualFinishTarget, totalMatchesFor, roundsFor, estimateMinutes,
} from '@/lib/americano'

const inputCls = 'w-full font-poppins text-sm text-white placeholder-white/30 bg-navy-card border border-white/8 rounded-xl px-4 py-3 outline-none focus:border-orange/40'
const labelCls = 'font-poppins text-white/50 text-xs uppercase tracking-wider block mb-2'

function fmtDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// Closest player counts (within limits) that support a true Americano.
function nearestTrueCounts(n: number): number[] {
  const out: number[] = []
  for (let below = n - 1; below >= MIN_PLAYERS; below--) {
    if (isTrueAmericanoCount(below)) { out.push(below); break }
  }
  for (let above = n + 1; above <= MAX_PLAYERS; above++) {
    if (isTrueAmericanoCount(above)) { out.push(above); break }
  }
  return out
}

// Largest equal-finish target at or below m (everyone ends on the same count).
function largestEqualTarget(n: number, m: number): number | null {
  for (let t = m; t >= 1; t--) if (isEqualFinishTarget(n, t)) return t
  return null
}

type TargetOption = {
  m: number | null // null = open-ended
  title: string
  note: string | null // amber caveat, if any
}

function buildTargetOptions(n: number): TargetOption[] {
  const opts: TargetOption[] = []
  const full = n - 1
  const extras = (n * full) % 4 === 0 ? 0 : 4 - ((n * full) % 4)
  opts.push({
    m: full,
    title: `Everyone plays everyone — ${full} matches each`,
    note: isTrueAmericanoCount(n)
      ? null
      : `${n} players can't finish even here — ${extras} ${extras === 1 ? 'player gets' : 'players get'} one extra match (lowest on the table first) and some partners repeat.`,
  })
  if (!isEqualFinishTarget(n, full)) {
    const eq = largestEqualTarget(n, full - 1)
    if (eq !== null && eq >= 2) {
      opts.push({ m: eq, title: `Equal finish — ${eq} matches each`, note: null })
    }
  }
  const short = largestEqualTarget(n, Math.max(2, Math.floor(full / 2)))
  if (short !== null && short >= 2 && !opts.some(o => o.m === short)) {
    opts.push({ m: short, title: `Short night — ${short} matches each`, note: null })
  }
  if (n <= 9) {
    opts.push({
      m: 2 * full,
      title: `Double rotation — ${2 * full} matches each`,
      note: 'Everyone partners everyone twice. Only sane for small groups — check the time estimate.',
    })
  }
  opts.push({ m: null, title: 'Open-ended — no target', note: 'Draw rounds freely and end whenever. No finish line, no evenness guarantee.' })
  return opts
}

export default function NewClient() {
  const [name, setName] = useState('')
  const [playedOn, setPlayedOn] = useState(getTodayStr())
  const [format, setFormat] = useState<'americano' | 'mexicano'>('americano')
  const [points, setPoints] = useState(21)
  const [courts, setCourts] = useState(2)
  const [countText, setCountText] = useState('')
  const [target, setTarget] = useState<number | null>(null)
  const [targetTouched, setTargetTouched] = useState(false)
  const [playersText, setPlayersText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ id: string; organizerToken: string; targetSaved?: boolean } | null>(null)

  const n = /^\d+$/.test(countText.trim()) ? parseInt(countText.trim(), 10) : null
  const nValid = n !== null && n >= MIN_PLAYERS && n <= MAX_PLAYERS

  const players = useMemo(
    () => playersText.split('\n').map(s => s.trim().replace(/\s+/g, ' ')).filter(Boolean),
    [playersText],
  )

  const targetOptions = useMemo(() => (nValid ? buildTargetOptions(n) : []), [n, nValid])
  // Default: full rotation when the count supports a clean one, otherwise the
  // biggest equal finish. The organizer can override.
  const defaultTarget = nValid ? (isTrueAmericanoCount(n) ? n - 1 : largestEqualTarget(n, n - 1)) : null
  const selectedTarget = targetTouched ? target : defaultTarget

  const planFor = (m: number) => {
    const matches = totalMatchesFor(n!, m)
    const rounds = roundsFor(n!, m, courts)
    return { matches, rounds, oneCourtMin: estimateMinutes(matches, points, 1), allCourtsMin: estimateMinutes(matches, points, courts) }
  }

  const submit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/americano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, playedOn, format, pointsPerMatch: points, courts, players, targetMatches: selectedTarget }),
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
          <p className="font-poppins text-white/50 text-sm mb-4">
            Round 1 is drawn. Two links matter now — one to share, one to keep.
          </p>
          {selectedTarget !== null && created.targetSaved !== false && (
            <p className="font-poppins text-white/40 text-xs mb-8">
              Finish line: {selectedTarget} matches per player — the organizer page will tell you when you&apos;re there.
            </p>
          )}
          {selectedTarget !== null && created.targetSaved === false && (
            <p className="font-poppins text-orange/80 text-xs mb-8">
              Heads up: the finish-line target couldn&apos;t be saved, so this tournament runs open-ended — draw rounds and end it manually.
            </p>
          )}

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
            Free tournament organizer by Matchbox. Tell us your group size, and we do the math — round draws,
            rotating partners, live standings, and a proper finish line. No account needed. Works at any court, anywhere.
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className={labelCls}>Tournament name</label>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={MAX_NAME_LEN}
              placeholder="Sunday Night Americano" className={inputCls} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <label className={labelCls}>How many players?</label>
            <input inputMode="numeric" value={countText} onChange={e => setCountText(e.target.value)}
              placeholder={`${MIN_PLAYERS}–${MAX_PLAYERS}`} className={`${inputCls} sm:w-40`} />
            {n !== null && !nValid && (
              <p className="font-poppins text-red-400 text-xs mt-2">Between {MIN_PLAYERS} and {MAX_PLAYERS} players.</p>
            )}
            {nValid && (
              isTrueAmericanoCount(n) ? (
                <p className="font-poppins text-green-400/90 text-xs mt-2 leading-relaxed">
                  ✓ {n} players supports a true Americano — everyone partners everyone once at {n - 1} matches each, and the draw keeps partner repeats to a bare minimum.
                </p>
              ) : (
                <p className="font-poppins text-orange/90 text-xs mt-2 leading-relaxed">
                  ⚠ {n} players can&apos;t make a true Americano — the math doesn&apos;t divide, so partners will repeat or match counts will differ.
                  Counts that work perfectly: {nearestTrueCounts(n).join(' or ')}. Staying at {n} is fine — pick an equal-finish target below.
                </p>
              )
            )}
          </div>

          {nValid && (
            <div>
              <label className={labelCls}>When does the night end?</label>
              <div className="space-y-2">
                {targetOptions.map(o => {
                  const active = selectedTarget === o.m
                  const plan = o.m !== null ? planFor(o.m) : null
                  return (
                    <button key={o.m ?? 'open'} onClick={() => { setTarget(o.m); setTargetTouched(true) }}
                      className={`w-full text-left rounded-2xl border p-4 transition-colors ${active ? 'border-orange/50 bg-orange/8' : 'border-white/8 bg-navy-card hover:border-white/20'}`}>
                      <p className={`font-poppins text-sm font-semibold ${active ? 'text-orange' : 'text-white'}`}>{o.title}</p>
                      {plan && (
                        <p className="font-poppins text-white/40 text-xs mt-1">
                          {plan.matches} matches · ~{plan.rounds} rounds on {courts} {courts === 1 ? 'court' : 'courts'} ·
                          {' '}≈{fmtDuration(plan.allCourtsMin)}{courts > 1 ? ` (${fmtDuration(plan.oneCourtMin)} on one court)` : ''}
                        </p>
                      )}
                      {o.note && <p className="font-poppins text-orange/70 text-xs mt-1 leading-relaxed">{o.note}</p>}
                    </button>
                  )
                })}
              </div>
              <p className="font-poppins text-white/25 text-xs mt-2 leading-relaxed">
                Time estimates use real-night pacing (~1 minute per point including changeovers and score entry) — they run long, not short.
              </p>
            </div>
          )}

          <div>
            <label className={labelCls}>
              Players <span className="normal-case tracking-normal">— one name per line{nValid ? ` (${players.length} of ${n} entered)` : ''}</span>
            </label>
            <textarea value={playersText} onChange={e => setPlayersText(e.target.value)} rows={8}
              placeholder={'Ali\nHamza\nSara\nBilal'}
              className={`${inputCls} resize-y leading-relaxed`} />
            {nValid && players.length !== n && players.length > 0 && (
              <p className="font-poppins text-white/35 text-xs mt-2">
                {players.length < n ? `${n - players.length} more ${n - players.length === 1 ? 'name' : 'names'} to go.` : `That's ${players.length} names for ${n} players — remove ${players.length - n} or bump the player count.`}
              </p>
            )}
            {players.some(p => p.length > MAX_PLAYER_NAME_LEN) && (
              <p className="font-poppins text-red-400 text-xs mt-2">Player names are limited to {MAX_PLAYER_NAME_LEN} characters.</p>
            )}
          </div>

          {error && <p className="font-poppins text-red-400 text-sm">{error}</p>}

          <button onClick={submit}
            disabled={submitting || !name.trim() || !nValid || players.length !== n}
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
