'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import TournamentView, { type TournamentState, type OrganizerActions } from '@/components/americano/TournamentView'

export default function ManageClient({ id, token }: { id: string; token: string }) {
  const [t, setT] = useState<TournamentState | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [busy, setBusy] = useState(false)
  const [actionErr, setActionErr] = useState<string | null>(null)
  const [confirmComplete, setConfirmComplete] = useState(false)
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

        {/* Round + completion controls */}
        {active && (
          <div className="mt-8 space-y-4">
            {actionErr && <p className="font-poppins text-red-400 text-sm">{actionErr}</p>}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={async () => { const e = await organizer.nextRound(); if (e) setActionErr(e) }}
                disabled={busy}
                className="flex-1 bg-orange hover:bg-orange-dark disabled:opacity-50 text-white font-poppins font-semibold text-sm px-8 py-4 rounded-full transition-all">
                {busy ? 'Working…' : `Draw round ${t.rounds.length + 1}`}
              </button>
              <button
                onClick={() => setConfirmComplete(true)}
                disabled={busy}
                className="flex-1 border border-white/15 hover:border-green-500/50 text-white/70 hover:text-green-400 font-poppins font-semibold text-sm px-8 py-4 rounded-full transition-colors disabled:opacity-50">
                Mark as completed
              </button>
            </div>
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
