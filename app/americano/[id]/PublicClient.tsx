'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import TournamentView, { type TournamentState } from '@/components/americano/TournamentView'

export default function PublicClient({ id }: { id: string }) {
  const [t, setT] = useState<TournamentState | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/americano/${id}`, { cache: 'no-store' })
      if (!res.ok) { setNotFound(true); return }
      const data = await res.json()
      setT(data.tournament)
    } finally {
      setRefreshing(false)
    }
  }, [id])

  // Live board: refetch every 45s while the tournament is running.
  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    if (!t || t.status !== 'active') return
    const iv = setInterval(() => { void load() }, 45_000)
    return () => clearInterval(iv)
  }, [t, load])

  if (notFound) {
    return (
      <div className="min-h-screen bg-navy pt-28">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-24 text-center">
          <p className="font-qaranta text-4xl text-white/20 uppercase mb-3">Tournament Not Found</p>
          <p className="font-poppins text-white/30 text-sm mb-8">This link may be wrong, or the tournament was removed.</p>
          <Link href="/americano/new"
            className="inline-flex items-center bg-orange hover:bg-orange-dark text-white font-poppins font-semibold text-sm px-8 py-3.5 rounded-full transition-colors">
            Start your own Americano
          </Link>
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

  return (
    <div className="min-h-screen bg-navy pt-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <TournamentView t={t} />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          {t.status === 'active' ? (
            <button onClick={() => { void load() }} disabled={refreshing}
              className="font-poppins text-xs font-semibold text-white/50 hover:text-orange border border-white/10 hover:border-orange/40 rounded-full px-4 py-2 transition-colors disabled:opacity-50">
              {refreshing ? 'Refreshing…' : 'Refresh standings'}
            </button>
          ) : <span />}
          <Link href="/americano/new" className="font-poppins text-xs text-white/30 hover:text-white/60 transition-colors">
            Run your own Americano — free, on Matchbox
          </Link>
        </div>
      </div>
    </div>
  )
}
