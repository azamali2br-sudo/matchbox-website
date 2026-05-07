'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatTime, formatDate, formatCurrency, getTodayStr, getDateStr } from '@/lib/constants'
import type { Booking, BookingStatus } from '@/lib/mock-data'

type FilterCourt = 'all' | 'A' | 'B'
type FilterStatus = 'all' | 'pending' | 'confirmed' | 'cancelled'

export default function AdminClient() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('mbx_admin') === '1') setAuthed(true)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        sessionStorage.setItem('mbx_admin', '1')
        setAuthed(true)
      } else {
        setAuthError('Incorrect password')
      }
    } catch {
      setAuthError('Connection error. Try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-2xl bg-orange/10 border border-orange/20 flex items-center justify-center mx-auto mb-6">
              <svg className="w-7 h-7 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="font-qaranta text-4xl text-white uppercase">Admin Access</h1>
            <p className="font-poppins text-white/40 text-sm mt-2">Matchbox Padel Club</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={`w-full bg-navy-card border rounded-xl px-4 py-3.5 font-poppins text-sm text-white placeholder:text-white/25 outline-none focus:border-orange/50 transition-colors ${authError ? 'border-red-400/50' : 'border-white/10'}`}
            />
            {authError && <p className="font-poppins text-red-400 text-xs">{authError}</p>}
            <button
              type="submit"
              disabled={authLoading || !password}
              className="w-full bg-orange hover:bg-orange-dark disabled:opacity-50 text-white font-poppins font-semibold text-sm py-3.5 rounded-xl transition-colors"
            >
              {authLoading ? 'Verifying...' : 'Enter Dashboard'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link href="/" className="font-poppins text-white/30 text-xs hover:text-white/60 transition-colors">
              ← Back to site
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <Dashboard onLogout={() => { sessionStorage.removeItem('mbx_admin'); setAuthed(false) }} />
}

type AdminTab = 'bookings' | 'matchiq'

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [adminTab, setAdminTab] = useState<AdminTab>('bookings')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCourt, setFilterCourt] = useState<FilterCourt>('all')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterDate, setFilterDate] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)
  const [demoMode, setDemoMode] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/bookings')
      const data = await res.json()
      if (data.demoMode) setDemoMode(true)
      setBookings(data.bookings || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function updateStatus(id: string, status: BookingStatus) {
    setUpdating(id)
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (res.ok) {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
      } else {
        alert(data.error || 'Update failed')
      }
    } finally {
      setUpdating(null)
    }
  }

  async function deleteBooking(id: string, name: string) {
    if (!confirm(`Delete booking for ${name}? This cannot be undone.`)) return
    setUpdating(id)
    try {
      const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setBookings(prev => prev.filter(b => b.id !== id))
      }
    } finally {
      setUpdating(null)
    }
  }

  const filtered = bookings.filter(b => {
    if (filterCourt !== 'all' && b.court !== filterCourt) return false
    if (filterStatus !== 'all' && b.status !== filterStatus) return false
    if (filterDate && b.date !== filterDate) return false
    return true
  })

  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    todayRevenue: bookings
      .filter(b => b.date === getTodayStr() && b.status === 'confirmed')
      .reduce((sum, b) => sum + b.totalPrice, 0),
  }

  return (
    <div className="min-h-screen bg-navy">
      {/* Top nav */}
      <div className="sticky top-0 z-50 bg-navy-dark border-b border-white/8 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange/15 flex items-center justify-center">
              <span className="font-qaranta text-orange text-sm">M</span>
            </div>
            <span className="font-qaranta text-white uppercase text-lg">Matchbox Admin</span>
            {demoMode && (
              <span className="font-poppins text-xs bg-orange/10 text-orange border border-orange/20 rounded-full px-2 py-0.5">
                Demo
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <Link href="/match-iq" className="font-poppins text-white/40 text-xs hover:text-white/70 transition-colors">
              Match IQ ↗
            </Link>
            <Link href="/booking" className="font-poppins text-white/40 text-xs hover:text-white/70 transition-colors">
              Booking Page ↗
            </Link>
            <button
              onClick={onLogout}
              className="font-poppins text-white/40 text-xs hover:text-white/70 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Tab switcher */}
        <div className="flex gap-1 bg-navy-card border border-white/8 rounded-xl p-1 w-fit mb-8">
          {(['bookings', 'matchiq'] as AdminTab[]).map(t => (
            <button
              key={t}
              onClick={() => setAdminTab(t)}
              className={`font-poppins text-xs font-semibold px-5 py-2.5 rounded-lg transition-all ${
                adminTab === t ? 'bg-orange text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t === 'bookings' ? 'Bookings' : 'Match IQ'}
            </button>
          ))}
        </div>

        {adminTab === 'matchiq' ? (
          <MatchIQAdmin />
        ) : (
        <>
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Bookings', value: stats.total, color: 'text-white' },
            { label: 'Pending Payment', value: stats.pending, color: 'text-amber-400' },
            { label: 'Confirmed', value: stats.confirmed, color: 'text-green-400' },
            { label: "Today's Revenue", value: formatCurrency(stats.todayRevenue), color: 'text-orange' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-navy-card rounded-2xl border border-white/8 p-5">
              <p className="font-poppins text-white/40 text-xs uppercase tracking-widest mb-2">{label}</p>
              <p className={`font-qaranta text-3xl ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex gap-2">
            {(['all', 'A', 'B'] as FilterCourt[]).map(c => (
              <button
                key={c}
                onClick={() => setFilterCourt(c)}
                className={`font-poppins text-xs font-semibold px-3 py-2 rounded-xl transition-colors ${filterCourt === c ? 'bg-orange text-white' : 'bg-navy-card border border-white/8 text-white/50 hover:border-orange/30'}`}
              >
                {c === 'all' ? 'All Courts' : `Box ${c}`}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            {(['all', 'pending', 'confirmed', 'cancelled'] as FilterStatus[]).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`font-poppins text-xs font-semibold px-3 py-2 rounded-xl transition-colors capitalize ${filterStatus === s ? 'bg-orange text-white' : 'bg-navy-card border border-white/8 text-white/50 hover:border-orange/30'}`}
              >
                {s === 'all' ? 'All Status' : s}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={filterDate}
            min={getDateStr(-30)}
            max={getDateStr(30)}
            onChange={e => setFilterDate(e.target.value)}
            className="bg-navy-card border border-white/8 text-white/60 font-poppins text-xs px-3 py-2 rounded-xl outline-none focus:border-orange/40"
          />
          {filterDate && (
            <button
              onClick={() => setFilterDate('')}
              className="font-poppins text-xs text-white/40 hover:text-white/70 px-2"
            >
              Clear date ×
            </button>
          )}
          <button
            onClick={fetchAll}
            className="ml-auto font-poppins text-xs text-orange border border-orange/30 hover:border-orange px-3 py-2 rounded-xl transition-colors"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Bookings table */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-navy-card rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-qaranta text-3xl text-white/20 uppercase mb-3">No Bookings</p>
            <p className="font-poppins text-white/30 text-sm">No bookings match your current filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(booking => (
                <div
                  key={booking.id}
                  className={`bg-navy-card rounded-2xl border transition-colors p-5 ${
                    booking.status === 'pending' ? 'border-amber-400/20' :
                    booking.status === 'confirmed' ? 'border-green-500/15' :
                    'border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Left info */}
                    <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <p className="font-poppins text-white/35 text-xs uppercase tracking-wider">Court & Time</p>
                        <p className="font-poppins text-white text-sm font-medium mt-0.5">
                          Box {booking.court} · {formatTime(booking.startTime)}
                        </p>
                        <p className="font-poppins text-white/40 text-xs">{formatDate(booking.date)}</p>
                      </div>
                      <div>
                        <p className="font-poppins text-white/35 text-xs uppercase tracking-wider">Customer</p>
                        <p className="font-poppins text-white text-sm font-medium mt-0.5">{booking.name}</p>
                        <p className="font-poppins text-white/40 text-xs">{booking.phone}</p>
                      </div>
                      <div>
                        <p className="font-poppins text-white/35 text-xs uppercase tracking-wider">Duration & Price</p>
                        <p className="font-poppins text-white text-sm font-medium mt-0.5">{booking.durationHours}hr</p>
                        <p className="font-poppins text-orange text-xs">{formatCurrency(booking.totalPrice)}</p>
                      </div>
                      <div>
                        <p className="font-poppins text-white/35 text-xs uppercase tracking-wider">Ref</p>
                        <p className="font-poppins text-white/70 text-sm font-medium font-mono mt-0.5">{booking.ref}</p>
                        <StatusBadge status={booking.status} />
                        {booking.status === 'pending' && booking.holdExpiresAt && (
                          <HoldExpiry expiresAt={booking.holdExpiresAt} />
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      {booking.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(booking.id, 'confirmed')}
                          disabled={updating === booking.id}
                          className="bg-green-500/15 border border-green-500/30 hover:bg-green-500/25 text-green-400 font-poppins text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                        >
                          {updating === booking.id ? '...' : '✓ Confirm'}
                        </button>
                      )}
                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => updateStatus(booking.id, 'pending')}
                          disabled={updating === booking.id}
                          className="bg-amber-400/10 border border-amber-400/20 hover:bg-amber-400/20 text-amber-400 font-poppins text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                        >
                          {updating === booking.id ? '...' : '↩ Unconfirm'}
                        </button>
                      )}
                      {booking.status !== 'cancelled' && (
                        <button
                          onClick={() => updateStatus(booking.id, 'cancelled')}
                          disabled={updating === booking.id}
                          className="bg-white/5 border border-white/10 hover:border-red-400/30 hover:text-red-400 text-white/40 font-poppins text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => deleteBooking(booking.id, booking.name)}
                        disabled={updating === booking.id}
                        className="bg-white/3 border border-white/8 hover:border-red-500/40 hover:text-red-400 text-white/20 font-poppins text-xs px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  )
}

type PendingMatch = {
  id: string
  played_on: string
  team1_score: number
  team2_score: number
  submitted_by: string
  created_at: string
  p1: { id: string; name: string }
  p2: { id: string; name: string }
  p3: { id: string; name: string }
  p4: { id: string; name: string }
}

function MatchIQAdmin() {
  const [pending, setPending] = useState<PendingMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await fetch('/api/match-iq/matches?status=pending&limit=50')
    const data = await res.json()
    setPending(data.matches ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function act(id: string, action: 'approve' | 'reject') {
    setActing(id)
    await fetch(`/api/match-iq/matches/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setPending(prev => prev.filter(m => m.id !== id))
    setActing(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-qaranta text-2xl text-white uppercase">Pending Matches</h2>
          <p className="font-poppins text-white/35 text-xs mt-1">Approve to update player ratings</p>
        </div>
        <button onClick={load} className="font-poppins text-xs text-orange border border-orange/30 hover:border-orange px-3 py-2 rounded-xl transition-colors">
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-navy-card rounded-2xl animate-pulse" />)}</div>
      ) : pending.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-qaranta text-3xl text-white/20 uppercase mb-2">All Clear</p>
          <p className="font-poppins text-white/30 text-sm">No pending match submissions.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pending.map(match => (
            <div key={match.id} className="bg-navy-card border border-amber-400/20 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-poppins text-white text-sm font-semibold">
                      {match.p1.name} &amp; {match.p2.name}
                    </span>
                    <span className="font-qaranta text-xl text-orange">{match.team1_score}</span>
                    <span className="font-poppins text-white/30 text-xs">vs</span>
                    <span className="font-qaranta text-xl text-white/50">{match.team2_score}</span>
                    <span className="font-poppins text-white/50 text-sm">
                      {match.p3.name} &amp; {match.p4.name}
                    </span>
                  </div>
                  <p className="font-poppins text-white/30 text-xs">
                    Played {new Date(match.played_on).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}Submitted by {match.submitted_by}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => act(match.id, 'approve')}
                    disabled={acting === match.id}
                    className="bg-green-500/15 border border-green-500/30 hover:bg-green-500/25 text-green-400 font-poppins text-xs font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {acting === match.id ? '...' : '✓ Approve'}
                  </button>
                  <button
                    onClick={() => act(match.id, 'reject')}
                    disabled={acting === match.id}
                    className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-poppins text-xs font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function HoldExpiry({ expiresAt }: { expiresAt: string }) {
  const expires = new Date(expiresAt)
  const now = new Date()
  const isExpired = expires < now
  const minutesLeft = Math.ceil((expires.getTime() - now.getTime()) / 60000)
  const timeStr = expires.toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true })

  if (isExpired) {
    return <p className="font-poppins text-red-400/70 text-xs mt-1">Hold expired</p>
  }
  return (
    <p className="font-poppins text-amber-400/70 text-xs mt-1">
      Holds until {timeStr} ({minutesLeft}m left)
    </p>
  )
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const styles: Record<BookingStatus, string> = {
    pending: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-400/60 border-red-500/15',
  }
  return (
    <span className={`inline-block font-poppins text-xs font-semibold capitalize px-2 py-0.5 rounded-full border mt-1 ${styles[status]}`}>
      {status}
    </span>
  )
}
