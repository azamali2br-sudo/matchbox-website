'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { targetProgress, isActivePlayer } from '@/lib/americano'
import TournamentView, { type TournamentState, type OrganizerActions } from '@/components/americano/TournamentView'

export default function ManageClient({ id, token, roundCap = null }: { id: string; token: string; roundCap?: number | null }) {
  const [t, setT] = useState<TournamentState | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionErr, setActionErr] = useState<string | null>(null)
  const [confirmComplete, setConfirmComplete] = useState(false)
  const [confirmReshuffle, setConfirmReshuffle] = useState(false)
  const [copied, setCopied] = useState(false)

  const base = `/api/americano/${id}/manage/${token}`

  const load = useCallback(async () => {
    const res = await fetch(base, { cache: 'no-store' })
    if (!res.ok) { setNotFound(true); return }
    const data = await res.json()
    setT(data.tournament)
  }, [base])

  useEffect(() => { void load() }, [load])

  const act = useCallback(async (body: Record<string, unknown>): Promise<string | null> => {
    setBusy(true)
    setActionErr(null)
    try {
      const res = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) return data.error ?? 'Something went wrong.'
      setT(data.tournament)
      return null
    } catch {
      return 'Network error — please try again.'
    } finally {
      setBusy(false)
    }
  }, [base])

  if (notFound) {
    return (
      <div className="min-h-screen bg-navy pt-28">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center">
          <p className="font-qaranta text-4xl text-white/20 uppercase mb-3">Invalid Organizer Link</p>
          <p className="font-poppins text-white/30 text-sm">Double-check the link — this one doesn&apos;t open any tournament.</p>
        </div>
      </div>
    )
  }

  if (!t) {
    return (
      <div className="min-h-screen bg-navy pt-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 space-y-3">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 bg-navy-card rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  const active = t.status === 'active'
  const unscored = t.rounds.reduce((n, r) => n + r.matches.filter(m => m.score1 === null).length, 0)
  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/americano/${t.id}` : ''

  // Matches-per-player finish line (null on open-ended tournaments).
  const target = t.targetMatches
  const progress = target !== null ? targetProgress(t.players, t.rounds, target) : null
  const activeApps = progress ? t.players.filter(isActivePlayer).map(p => progress.appearances.get(p.id) ?? 0) : []
  const allDrawn = progress !== null && progress.totalNeed === 0
  const finished = allDrawn && unscored === 0
  const roundsToGo = progress !== null
    ? Math.ceil(progress.totalNeed / (4 * Math.max(1, Math.min(t.courts, Math.floor(activeApps.length / 4)))))
    : 0
  // Played (scored) matches per active player — the progress that matters once
  // the whole schedule is drawn up front.
  const activeGames = t.standings.filter(s => s.active).map(s => s.games)
  // Trailing rounds with no scores at all are the reshuffleable ones.
  const lastScoredIdx = t.rounds.reduce(
    (last, r, i) => (r.matches.some(m => m.score1 !== null || m.score2 !== null) ? i : last), -1)
  const reshufflable = t.rounds.length - (lastScoredIdx + 1)

  const organizer: OrganizerActions = {
    saveScore: (round, match, s1, s2) => act({ action: 'score', round, match, score1: s1, score2: s2 }),
    nextRound: () => act({ action: 'nextRound' }),
    complete: () => act({ action: 'complete' }),
    busy,
  }

  const copyPublic = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* URL is on screen for manual copy */ }
  }

  return (
    <div className="min-h-screen bg-navy pt-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        {/* Organizer bar */}
        <div className="bg-navy-card border border-orange/25 rounded-2xl px-4 sm:px-5 py-3.5 mb-8 flex flex-wrap items-center gap-3">
          <span className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest">Organizer view</span>
          <span className="font-poppins text-white/30 text-xs hidden sm:inline">Scores you save appear on the shared standings page instantly.</span>
          <button onClick={copyPublic}
            className="ml-auto font-poppins text-xs font-semibold text-white/60 hover:text-orange border border-white/10 hover:border-orange/40 rounded-full px-4 py-2 transition-colors">
            {copied ? 'Copied' : 'Copy standings link'}
          </button>
        </div>

        <TournamentView t={t} organizer={active ? organizer : undefined} />

        {/* Player management — late arrivals join, leavers come off the draw */}
        {active && <PlayersPanel t={t} act={act} busy={busy} />}

        {/* Round + completion controls */}
        {active && (
          <div className="mt-8 space-y-4">
            {target !== null && !allDrawn && (
              <p className="font-poppins text-white/40 text-xs text-center">
                Finish line: {target} matches per player — everyone is at {Math.min(...activeApps)}–{Math.max(...activeApps)}, roughly {roundsToGo} {roundsToGo === 1 ? 'round' : 'rounds'} to go.
              </p>
            )}
            {allDrawn && !finished && activeGames.length > 0 && (
              <p className="font-poppins text-white/40 text-xs text-center">
                All {t.rounds.length} rounds are drawn — players are at {Math.min(...activeGames)}–{Math.max(...activeGames)} of {target} matches played. Score as you play.
              </p>
            )}
            {actionErr && <p className="font-poppins text-red-400 text-sm">{actionErr}</p>}
            <div className="flex flex-col sm:flex-row gap-3">
              {finished ? (
                <div className="flex-1 border border-green-500/30 bg-green-500/5 rounded-full px-8 py-4 text-center">
                  <span className="font-poppins text-green-400/90 text-sm font-semibold">
                    Everyone has reached {target} matches — finish up below.
                  </span>
                </div>
              ) : allDrawn ? null : roundCap !== null && t.rounds.length >= roundCap ? (
                <div className="flex-1 border border-white/15 rounded-full px-8 py-4 text-center">
                  <span className="font-poppins text-white/50 text-sm font-semibold">
                    Round cap reached ({roundCap}) — enter any missing scores, then finish up.
                  </span>
                </div>
              ) : (
                <button
                  onClick={async () => { const e = await organizer.nextRound(); if (e) setActionErr(e) }}
                  disabled={busy}
                  className="flex-1 bg-orange hover:bg-orange-dark disabled:opacity-50 text-white font-poppins font-semibold text-sm px-8 py-4 rounded-full transition-all">
                  {busy ? 'Working…' : `Draw round ${t.rounds.length + 1}${roundCap !== null ? ` of ${roundCap}` : ''}`}
                </button>
              )}
              <button
                onClick={() => setConfirmComplete(true)}
                disabled={busy}
                className="flex-1 border border-white/15 hover:border-green-500/50 text-white/70 hover:text-green-400 font-poppins font-semibold text-sm px-8 py-4 rounded-full transition-colors disabled:opacity-50">
                Mark as completed
              </button>
            </div>
            {reshufflable > 0 && (
              <button
                onClick={() => setConfirmReshuffle(true)}
                disabled={busy}
                className="w-full border border-white/10 hover:border-orange/40 text-white/50 hover:text-orange font-poppins font-semibold text-xs px-6 py-3 rounded-full transition-colors disabled:opacity-50">
                Reshuffle upcoming rounds ({reshufflable})
              </button>
            )}
            {unscored > 0 && (
              <p className="font-poppins text-white/30 text-xs text-center">
                {unscored} {unscored === 1 ? 'match has' : 'matches have'} no score yet — unscored matches don&apos;t count toward standings.
              </p>
            )}
          </div>
        )}

        {!active && (
          <div className="mt-8 bg-navy-card border border-white/8 rounded-2xl p-5 text-center">
            <p className="font-poppins text-white/50 text-sm">
              This tournament is completed and locked — the standings above are final.
            </p>
            <Link href={`/americano/${t.id}`} className="font-poppins text-orange text-xs font-semibold inline-block mt-2 hover:underline">
              View the public recap page
            </Link>
          </div>
        )}

        {/* Confirm reshuffle modal */}
        {confirmReshuffle && (
          <div className="fixed inset-0 z-50 bg-navy/90 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-navy-card border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full">
              <h3 className="font-qaranta text-2xl text-white uppercase mb-3">Reshuffle upcoming rounds?</h3>
              <p className="font-poppins text-white/50 text-sm leading-relaxed mb-2">
                Every round without a score ({reshufflable}) gets redrawn with a fresh shuffle — use it when the
                pairings on the board don&apos;t match who&apos;s actually at the court.
                Played rounds and scores stay exactly as they are.
              </p>
              <p className="font-poppins text-white/35 text-xs leading-relaxed">
                Tip: remove no-shows in Manage players first, then reshuffle — the new draw only uses players in the draw.
              </p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setConfirmReshuffle(false)}
                  className="flex-1 border border-white/15 text-white/70 font-poppins font-semibold text-sm px-6 py-3 rounded-full">
                  Keep the draw
                </button>
                <button
                  onClick={async () => {
                    setConfirmReshuffle(false)
                    const e = await act({ action: 'reshuffle' })
                    if (e) setActionErr(e)
                  }}
                  className="flex-1 bg-orange hover:bg-orange-dark text-white font-poppins font-semibold text-sm px-6 py-3 rounded-full transition-colors">
                  Reshuffle
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm completion modal */}
        {confirmComplete && (
          <div className="fixed inset-0 z-50 bg-navy/90 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-navy-card border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full">
              <h3 className="font-qaranta text-2xl text-white uppercase mb-3">Finish tournament?</h3>
              <p className="font-poppins text-white/50 text-sm leading-relaxed mb-2">
                Standings become final and locked — no more rounds, no score edits.
                {t.standings.length > 0 && (
                  <> <span className="text-white">{t.standings[0].name}</span> will be crowned champion.</>
                )}
              </p>
              {unscored > 0 && (
                <p className="font-poppins text-orange/80 text-xs mb-4">
                  Heads up: {unscored} unscored {unscored === 1 ? 'match' : 'matches'} will be discarded.
                </p>
              )}
              <div className="flex gap-3 mt-6">
                <button onClick={() => setConfirmComplete(false)}
                  className="flex-1 border border-white/15 text-white/70 font-poppins font-semibold text-sm px-6 py-3 rounded-full">
                  Keep playing
                </button>
                <button
                  onClick={async () => {
                    setConfirmComplete(false)
                    const e = await organizer.complete()
                    if (e) setActionErr(e)
                  }}
                  className="flex-1 bg-orange hover:bg-orange-dark text-white font-poppins font-semibold text-sm px-6 py-3 rounded-full transition-colors">
                  Finish it
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Add players who show up late (they join the next draw immediately — the
// rounds they missed count as sit-out credit) and remove players who leave
// (they keep their points; they just stop being drawn).
function PlayersPanel({ t, act, busy }: {
  t: TournamentState
  act: (body: Record<string, unknown>) => Promise<string | null>
  busy: boolean
}) {
  const [open, setOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [err, setErr] = useState<string | null>(null)

  const activeCount = t.players.filter(p => p.active !== false).length

  const add = async () => {
    if (!newName.trim()) return
    setErr(null)
    const e = await act({ action: 'addPlayer', name: newName })
    if (e) setErr(e)
    else setNewName('')
  }
  const setActive = async (playerId: number, activeFlag: boolean) => {
    setErr(null)
    const e = await act({ action: 'setPlayerActive', playerId, active: activeFlag })
    if (e) setErr(e)
  }

  return (
    <div className="mt-8 bg-navy-card border border-white/8 rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 text-left hover:bg-white/[0.02] transition-colors">
        <span className="font-poppins text-xs font-semibold text-white/70">
          Manage players <span className="text-white/35">({activeCount} in the draw)</span>
        </span>
        <span className={`text-white/40 text-[10px] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="border-t border-white/8 px-4 sm:px-5 py-4 space-y-4">
          <p className="font-poppins text-white/35 text-xs leading-relaxed">
            Changes apply from the next round you draw — rounds already on the board stay as they are.
            A late joiner plays in the next draw; a removed player keeps their points but stops being drawn.
          </p>

          <div className="flex gap-2">
            <input value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void add() }}
              placeholder="Add a player who just arrived…"
              className="flex-1 font-poppins text-sm text-white placeholder-white/30 bg-navy border border-white/10 rounded-xl px-4 py-2.5 outline-none focus:border-orange/40" />
            <button onClick={() => { void add() }} disabled={busy || !newName.trim()}
              className="shrink-0 font-poppins text-xs font-semibold bg-orange hover:bg-orange-dark disabled:opacity-40 text-white rounded-xl px-5 py-2.5 transition-colors">
              Add
            </button>
          </div>
          {err && <p className="font-poppins text-red-400 text-xs">{err}</p>}

          <div className="space-y-1.5">
            {t.players.map(p => {
              const isOut = p.active === false
              return (
                <div key={p.id} className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${isOut ? 'border-white/5 opacity-50' : 'border-white/8'}`}>
                  <p className="flex-1 min-w-0 font-poppins text-sm text-white font-medium truncate">
                    {p.name}
                    {(p.joinedAtRound ?? 0) > 0 && (
                      <span className="font-poppins text-white/30 text-[11px] font-normal ml-2">joined round {(p.joinedAtRound ?? 0) + 1}</span>
                    )}
                  </p>
                  <button onClick={() => { void setActive(p.id, isOut) }} disabled={busy}
                    className={`shrink-0 font-poppins text-[11px] font-semibold rounded-full px-3.5 py-1.5 border transition-colors disabled:opacity-50 ${
                      isOut
                        ? 'text-white/60 border-white/15 hover:border-orange/40 hover:text-orange'
                        : 'text-red-400/70 border-red-500/20 hover:border-red-500/50 hover:text-red-400'
                    }`}>
                    {isOut ? 'Bring back' : 'Remove'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
