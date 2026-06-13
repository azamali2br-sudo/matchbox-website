'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { formatCurrency, formatDate, formatTime, getTodayStr } from '@/lib/constants'
import { formatPhoneDisplay } from '@/lib/phone'
import { BADGE_DEFS, BADGE_TONE, sortBadges, type BadgeKey } from '@/lib/badges'

type Dashboard = {
  account: { id: string; name: string; phone: string; email: string | null; verified: boolean }
  matchIq: { playerId: string; rating: number; wins: number; losses: number; matches: number } | null
  credit: {
    balance: number
    totalIn: number
    totalOut: number
    ledger: { amount: number; source: string; note: string | null; created_at: string; expires_at: string | null; balanceAfter: number }[]
  }
  bookings: { id: string; ref: string; court: 'A' | 'B'; date: string; start_time: string; end_time: string; duration_hours: number; attendance: string; grand_total: number; paid_amount: number; credit_applied: number; source: string }[]
}

function txnLabel(source: string, amount: number): string {
  switch (source) {
    case 'prepay_reward': return amount >= 0 ? 'Credit earned · prepay reward' : 'Reward reversed · cancellation'
    case 'cancel_refund': return 'Cancellation credit'
    case 'redemption': return 'Redeemed on booking'
    case 'manual_adjust': return amount >= 0 ? 'Credit added' : 'Credit deducted'
    default: return source
  }
}

function bookingState(b: Dashboard['bookings'][number]): { label: string; cls: string } {
  if (b.attendance === 'cancelled') return { label: 'Cancelled', cls: 'text-red-400 bg-red-500/10 border-red-500/20' }
  if (b.attendance === 'no_show') return { label: 'No-show', cls: 'text-red-400 bg-red-500/10 border-red-500/20' }
  if (b.attendance === 'attended') return { label: 'Played', cls: 'text-green-400 bg-green-500/10 border-green-500/20' }
  const settled = b.paid_amount + b.credit_applied >= b.grand_total && b.grand_total > 0
  return settled
    ? { label: 'Confirmed', cls: 'text-green-400 bg-green-500/10 border-green-500/20' }
    : { label: 'Pending payment', cls: 'text-orange bg-orange/10 border-orange/25' }
}

export default function AccountPage() {
  const router = useRouter()
  const [data, setData] = useState<Dashboard | null>(null)
  const [badges, setBadges] = useState<BadgeKey[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/account/me')
      .then(async res => {
        if (res.status === 401) { router.replace('/login'); return null }
        return res.json()
      })
      .then(d => { if (d) setData(d) })
      .finally(() => setLoading(false))
  }, [router])

  // Badges earned across all months (for the trophy row) — derived from the profile API.
  useEffect(() => {
    const pid = data?.matchIq?.playerId
    if (!pid) return
    fetch(`/api/match-iq/players/${pid}`)
      .then(r => r.json())
      .then(d => setBadges([...new Set((d.trophyCase ?? []).flatMap((t: { badges: BadgeKey[] }) => t.badges))] as BadgeKey[]))
      .catch(() => {})
  }, [data?.matchIq?.playerId])

  async function logout() {
    await fetch('/api/account/logout', { method: 'POST' })
    router.replace('/')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy pt-28 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-orange/40 border-t-orange rounded-full animate-spin" />
      </div>
    )
  }
  if (!data) return null

  const today = getTodayStr()
  const upcoming = data.bookings.filter(b => b.date >= today && b.attendance !== 'cancelled')
  const past = data.bookings.filter(b => b.date < today || b.attendance === 'cancelled')

  return (
    <div className="min-h-screen bg-navy pt-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div className="min-w-0">
            <h1 className="font-qaranta text-4xl text-white mb-1">Hey {data.account.name.split(' ')[0]}</h1>
            <p className="font-poppins text-white/45 text-sm break-words leading-snug">
              {formatPhoneDisplay(data.account.phone)}{data.account.email ? ` · ${data.account.email}` : ''}
            </p>
          </div>
          <button onClick={logout} className="shrink-0 font-poppins text-white/50 hover:text-white text-sm border border-white/10 hover:border-white/25 rounded-full px-4 py-2 transition-colors">
            Log out
          </button>
        </div>

        {/* Credit + Match IQ */}
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          {/* Credit */}
          <div className="bg-gradient-to-br from-orange/15 to-orange/5 border border-orange/25 rounded-2xl p-6">
            <div className="font-poppins text-white/55 text-xs uppercase tracking-wide mb-2">Credit balance</div>
            <div className="font-qaranta text-4xl text-orange mb-1">{formatCurrency(data.credit.balance)}</div>
            <p className="font-poppins text-white/40 text-xs">Apply it at checkout on your next booking.</p>
          </div>

          {/* Match IQ */}
          <div className="bg-navy-card border border-white/8 rounded-2xl p-6">
            <div className="font-poppins text-white/55 text-xs uppercase tracking-wide mb-2">Match IQ rating</div>
            {data.matchIq ? (
              <>
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="font-qaranta text-4xl text-white">{data.matchIq.rating}</span>
                  <span className="font-poppins text-white/50 text-sm">{data.matchIq.wins}W – {data.matchIq.losses}L · {data.matchIq.matches} matches</span>
                </div>
                <Link href={`/match-iq/${data.matchIq.playerId}`} className="font-poppins text-orange hover:text-orange-dark text-xs">View full profile →</Link>
                {badges.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {sortBadges(badges).map(k => {
                      const d = BADGE_DEFS[k]
                      return (
                        <span key={k} title={d.desc}
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-poppins font-semibold ${BADGE_TONE[d.tone]}`}>
                          <span>{d.icon}</span>{d.label}
                        </span>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="font-qaranta text-2xl text-white/40 mb-1">Unrated</div>
                <p className="font-poppins text-white/40 text-xs">Play a match and submit the score to get rated.</p>
              </>
            )}
          </div>
        </div>

        {/* Credit statement — every movement in and out, like a bank statement */}
        {data.credit.ledger.length > 0 && (
          <div className="bg-navy-card border border-white/8 rounded-2xl p-6 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="font-poppins text-white/55 text-xs uppercase tracking-wide">Credit statement</div>
              <div className="flex items-center gap-4 font-poppins text-xs">
                <span className="text-green-400">In {formatCurrency(data.credit.totalIn)}</span>
                <span className="text-white/40">Out {formatCurrency(data.credit.totalOut)}</span>
              </div>
            </div>
            <div className="divide-y divide-white/6">
              {data.credit.ledger.map((c, i) => {
                const isIn = c.amount >= 0
                return (
                  <div key={i} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm ${isIn ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/40'}`}>
                        {isIn ? '↓' : '↑'}
                      </span>
                      <div className="min-w-0">
                        <div className="font-poppins text-white/80 text-sm truncate">{txnLabel(c.source, c.amount)}</div>
                        <div className="font-poppins text-white/35 text-xs">{formatDate(c.created_at.slice(0, 10))}</div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`font-poppins text-sm font-semibold ${isIn ? 'text-green-400' : 'text-white/55'}`}>
                        {isIn ? '+' : '−'}{formatCurrency(Math.abs(c.amount))}
                      </div>
                      <div className="font-poppins text-white/30 text-xs">Bal {formatCurrency(c.balanceAfter)}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Bookings */}
        <div className="bg-navy-card border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-poppins text-white/55 text-xs uppercase tracking-wide">Your bookings</div>
            <Link href="/booking" className="font-poppins text-orange hover:text-orange-dark text-xs font-semibold">Book a court →</Link>
          </div>

          {data.bookings.length === 0 ? (
            <p className="font-poppins text-white/40 text-sm py-4 text-center">No bookings yet. Your court history will show up here.</p>
          ) : (
            <div className="space-y-5">
              {upcoming.length > 0 && (
                <div>
                  <div className="font-poppins text-white/40 text-xs mb-2">Upcoming</div>
                  <div className="space-y-2">{upcoming.map(b => <BookingRow key={b.id} b={b} />)}</div>
                </div>
              )}
              {past.length > 0 && (
                <div>
                  <div className="font-poppins text-white/40 text-xs mb-2">Past</div>
                  <div className="space-y-2">{past.map(b => <BookingRow key={b.id} b={b} />)}</div>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

function BookingRow({ b }: { b: Dashboard['bookings'][number] }) {
  const st = bookingState(b)
  return (
    <div className="flex items-center justify-between gap-3 bg-navy border border-white/6 rounded-xl px-4 py-3">
      <div className="min-w-0">
        <div className="font-poppins text-white text-sm font-medium">
          Box {b.court} · {formatDate(b.date)}
        </div>
        <div className="font-poppins text-white/40 text-xs">
          {formatTime(b.start_time)} – {formatTime(b.end_time)} · {formatCurrency(b.grand_total)}
          {b.source !== 'online' ? ' · WhatsApp' : ''}
        </div>
      </div>
      <span className={`shrink-0 font-poppins text-xs font-medium border rounded-full px-2.5 py-1 ${st.cls}`}>{st.label}</span>
    </div>
  )
}
