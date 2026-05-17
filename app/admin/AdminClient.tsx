'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { formatTime, formatDate, formatCurrency, getTodayStr, getDateStr } from '@/lib/constants'
import type { Booking, Attendance } from '@/lib/mock-data'

type AdminTab = 'today' | 'outstanding' | 'cancellations' | 'customers' | 'matchiq'

export default function AdminClient() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/session')
      .then(r => r.json())
      .then(d => { if (d.authed) setAuthed(true) })
      .catch(() => {})
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true); setAuthError('')
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }), credentials: 'same-origin',
      })
      if (res.ok) setAuthed(true)
      else setAuthError('Incorrect password')
    } catch { setAuthError('Connection error. Try again.') }
    finally { setAuthLoading(false) }
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
              type="password" placeholder="Admin password" value={password}
              onChange={e => setPassword(e.target.value)}
              className={`w-full bg-navy-card border rounded-xl px-4 py-3.5 font-poppins text-sm text-white placeholder:text-white/25 outline-none focus:border-orange/50 transition-colors ${authError ? 'border-red-400/50' : 'border-white/10'}`}
            />
            {authError && <p className="font-poppins text-red-400 text-xs">{authError}</p>}
            <button
              type="submit" disabled={authLoading || !password}
              className="w-full bg-orange hover:bg-orange-dark disabled:opacity-50 text-white font-poppins font-semibold text-sm py-3.5 rounded-xl transition-colors"
            >
              {authLoading ? 'Verifying...' : 'Enter Dashboard'}
            </button>
          </form>
          <div className="mt-8 text-center">
            <Link href="/" className="font-poppins text-white/30 text-xs hover:text-white/60 transition-colors">← Back to site</Link>
          </div>
        </div>
      </div>
    )
  }

  return <Dashboard onLogout={() => setAuthed(false)} />
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<AdminTab>('today')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [demoMode, setDemoMode] = useState(false)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/bookings')
      const data = await res.json()
      if (data.demoMode) setDemoMode(true)
      setBookings(data.bookings || [])
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  function updateBooking(b: Booking) {
    setBookings(prev => prev.map(x => x.id === b.id ? b : x))
  }

  // Strategic north-star: % of past-or-today confirmed bookings that were paid online.
  // Proxy: source='online' AND paid_amount > 0.
  const onlinePaymentRate = useMemo(() => {
    const recent = bookings.filter(b => b.date <= getTodayStr() && b.attendance !== 'cancelled')
    if (recent.length === 0) return null
    const online = recent.filter(b => b.source === 'online' && b.paidAmount > 0).length
    return Math.round((online / recent.length) * 100)
  }, [bookings])

  return (
    <div className="min-h-screen bg-navy">
      <div className="sticky top-0 z-50 bg-navy-dark border-b border-white/8 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-orange/15 flex items-center justify-center shrink-0">
              <span className="font-qaranta text-orange text-sm">M</span>
            </div>
            <span className="font-qaranta text-white uppercase text-base sm:text-lg truncate">
              <span className="hidden sm:inline">Matchbox </span>Admin
            </span>
            {demoMode && <span className="font-poppins text-xs bg-orange/10 text-orange border border-orange/20 rounded-full px-2 py-0.5 shrink-0">Demo</span>}
          </div>
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <Link href="/match-iq" className="hidden sm:inline font-poppins text-white/40 text-xs hover:text-white/70">Match IQ ↗</Link>
            <Link href="/booking" className="hidden sm:inline font-poppins text-white/40 text-xs hover:text-white/70">Booking ↗</Link>
            <button onClick={onLogout} className="font-poppins text-white/40 text-xs hover:text-white/70">Log out</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* North-star metric */}
        {onlinePaymentRate !== null && tab !== 'matchiq' && (
          <div className="bg-navy-card border border-orange/20 rounded-2xl p-5 mb-6 flex items-center justify-between">
            <div>
              <p className="font-poppins text-white/40 text-[11px] uppercase tracking-widest mb-1">Paid Online</p>
              <p className="font-qaranta text-3xl text-orange">{onlinePaymentRate}%</p>
            </div>
            <p className="font-poppins text-white/40 text-xs max-w-[240px] text-right">Share of recent bookings settled through the site. Goal: drift up over time.</p>
          </div>
        )}

        {/* Tab switcher */}
        <div className="flex gap-1 bg-navy-card border border-white/8 rounded-xl p-1 mb-6 overflow-x-auto">
          {(['today', 'outstanding', 'cancellations', 'customers', 'matchiq'] as AdminTab[]).map(t => (
            <button
              key={t} onClick={() => setTab(t)}
              className={`font-poppins text-xs font-semibold px-4 py-2.5 rounded-lg transition-all whitespace-nowrap ${
                tab === t ? 'bg-orange text-white' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {t === 'today' ? 'Today' :
               t === 'outstanding' ? 'Outstanding' :
               t === 'cancellations' ? 'Cancellations' :
               t === 'customers' ? 'Customers' :
               'Match IQ'}
            </button>
          ))}
        </div>

        {tab === 'matchiq' ? <MatchIQAdmin /> :
         loading ? <Loading /> :
         tab === 'today' ? <TodayTab bookings={bookings} onUpdate={updateBooking} onRefresh={fetchAll} /> :
         tab === 'outstanding' ? <OutstandingTab bookings={bookings} onUpdate={updateBooking} onRefresh={fetchAll} /> :
         tab === 'cancellations' ? <CancellationsTab bookings={bookings} /> :
         <CustomersTab onRefresh={fetchAll} />}
      </div>
    </div>
  )
}

function Loading() {
  return <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-navy-card rounded-2xl animate-pulse" />)}</div>
}

// ─────────────────────────────────────────────────────────────
// TODAY TAB — the daily ops screen.
// ─────────────────────────────────────────────────────────────

function TodayTab({ bookings, onUpdate, onRefresh }: { bookings: Booking[]; onUpdate: (b: Booking) => void; onRefresh: () => void }) {
  const [date, setDate] = useState(getTodayStr())
  const [court, setCourt] = useState<'all' | 'A' | 'B'>('all')

  const list = bookings
    .filter(b => b.date === date)
    .filter(b => court === 'all' || b.court === court)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  const stats = {
    booked: list.filter(b => b.attendance === 'booked').length,
    attended: list.filter(b => b.attendance === 'attended').length,
    noShow: list.filter(b => b.attendance === 'no_show').length,
    revenue: list.filter(b => b.attendance !== 'cancelled').reduce((s, b) => s + b.paidAmount, 0),
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <input type="date" value={date} onChange={e => setDate(e.target.value)} max={getDateStr(60)}
          className="bg-navy-card border border-white/10 rounded-xl px-3 py-2 text-white/80 font-poppins text-sm outline-none focus:border-orange/50 [color-scheme:dark]" />
        <button onClick={() => setDate(getTodayStr())} className="font-poppins text-xs text-white/50 hover:text-white px-2">Today</button>
        <div className="flex gap-1 bg-navy-card border border-white/8 rounded-xl p-1">
          {(['all', 'A', 'B'] as const).map(c => (
            <button key={c} onClick={() => setCourt(c)}
              className={`font-poppins text-xs font-semibold px-3 py-1.5 rounded-lg ${court === c ? 'bg-orange text-white' : 'text-white/40 hover:text-white/70'}`}>
              {c === 'all' ? 'All' : `Box ${c}`}
            </button>
          ))}
        </div>
        <button onClick={onRefresh} className="ml-auto font-poppins text-xs text-orange border border-orange/30 hover:border-orange px-3 py-2 rounded-xl">↻ Refresh</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Stat label="Booked" value={String(stats.booked)} accent="text-amber-300" />
        <Stat label="Attended" value={String(stats.attended)} accent="text-green-400" />
        <Stat label="No-show" value={String(stats.noShow)} accent="text-red-400" />
        <Stat label="Revenue (paid)" value={formatCurrency(stats.revenue)} accent="text-orange" />
      </div>

      {list.length === 0 ? (
        <Empty title="No bookings" sub="Nothing on this date for the selected court." />
      ) : (
        <div className="space-y-3">
          {list.map(b => <BookingCard key={b.id} booking={b} onUpdate={onUpdate} mode="today" />)}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// OUTSTANDING TAB — attended + unpaid (oldest first).
// ─────────────────────────────────────────────────────────────

function OutstandingTab({ bookings, onUpdate, onRefresh }: { bookings: Booking[]; onUpdate: (b: Booking) => void; onRefresh: () => void }) {
  const list = bookings
    .filter(b => b.attendance === 'attended' && (b.paidAmount + b.creditApplied) < b.grandTotal)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))

  const totalOwed = list.reduce((s, b) => s + (b.grandTotal - b.paidAmount - b.creditApplied), 0)

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="font-qaranta text-2xl text-white uppercase">Outstanding</h2>
          <p className="font-poppins text-white/40 text-xs mt-1">
            {list.length} session{list.length === 1 ? '' : 's'} · {formatCurrency(totalOwed)} owed
          </p>
        </div>
        <button onClick={onRefresh} className="font-poppins text-xs text-orange border border-orange/30 hover:border-orange px-3 py-2 rounded-xl">↻ Refresh</button>
      </div>
      {list.length === 0 ? (
        <Empty title="All clear" sub="Every attended session is paid up." />
      ) : (
        <div className="space-y-3">
          {list.map(b => <BookingCard key={b.id} booking={b} onUpdate={onUpdate} mode="outstanding" />)}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CANCELLATIONS TAB
// ─────────────────────────────────────────────────────────────

function CancellationsTab({ bookings }: { bookings: Booking[] }) {
  const list = bookings
    .filter(b => b.attendance === 'cancelled')
    .sort((a, b) => (b.cancelledAt ?? '').localeCompare(a.cancelledAt ?? ''))

  return (
    <div>
      <h2 className="font-qaranta text-2xl text-white uppercase mb-6">Cancellations</h2>
      {list.length === 0 ? (
        <Empty title="No cancellations" sub="Nothing has been cancelled." />
      ) : (
        <div className="space-y-3">
          {list.map(b => {
            const hrs = b.hoursBeforeSlotAtCancel ?? 0
            const tier = hrs >= 24 ? '24+ hours' : hrs >= 2 ? '2–24 hours' : '< 2 hours'
            return (
              <div key={b.id} className="bg-navy-card border border-white/8 rounded-2xl p-5">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 min-w-0">
                    <Field label="Slot" value={`Box ${b.court} · ${formatTime(b.startTime)}`} sub={formatDate(b.date)} />
                    <Field label="Customer" value={b.name} sub={b.phone} />
                    <Field label="Tier" value={tier} sub={`${hrs.toFixed(1)} hrs before slot`} />
                    <Field label="By" value={b.cancelledBy ?? '—'} sub={b.cancelledAt ? new Date(b.cancelledAt).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// CUSTOMERS TAB (ledger)
// ─────────────────────────────────────────────────────────────

type CustomerRow = {
  phone: string; name: string; lastDate: string
  sessions: number; attended: number; noShow: number; noShowRecent: number
  cancels: { tier24: number; tier224: number; tierUnder2: number; total: number }
  outstanding: number; creditBalance: number; flagged: boolean
}

function CustomersTab({ onRefresh }: { onRefresh: () => void }) {
  const [customers, setCustomers] = useState<CustomerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState<CustomerRow | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/customers')
    const data = await res.json()
    setCustomers(data.customers || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const filtered = customers.filter(c =>
    !filter || c.name.toLowerCase().includes(filter.toLowerCase()) || c.phone.includes(filter),
  )

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <h2 className="font-qaranta text-2xl text-white uppercase">Customers</h2>
        <div className="flex gap-2">
          <input
            value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Search name or phone"
            className="bg-navy-card border border-white/10 rounded-xl px-3 py-2 text-white/80 font-poppins text-sm outline-none focus:border-orange/50 w-60"
          />
          <button onClick={() => { load(); onRefresh() }} className="font-poppins text-xs text-orange border border-orange/30 hover:border-orange px-3 py-2 rounded-xl">↻</button>
        </div>
      </div>
      {loading ? <Loading /> : filtered.length === 0 ? (
        <Empty title="No customers" sub="No customers match." />
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <button
              key={c.phone} onClick={() => setSelected(c)}
              className="w-full text-left bg-navy-card border border-white/8 hover:border-orange/30 rounded-xl p-4 transition-colors"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="font-poppins text-white text-sm font-semibold">{c.name}</span>
                {c.flagged && <span className="font-poppins text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">No-show risk</span>}
              </div>
              <div className="font-poppins text-white/40 text-xs flex flex-wrap gap-x-4 gap-y-1">
                <span>{c.phone}</span>
                <span>{c.sessions} sessions · {c.attended} attended · {c.noShow} no-show · {c.cancels.total} cancels</span>
                {c.outstanding > 0 && <span className="text-amber-300">Owes {formatCurrency(c.outstanding)}</span>}
                {c.creditBalance > 0 && <span className="text-orange">Credit {formatCurrency(c.creditBalance)}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <CustomerDetail customer={selected} onClose={() => setSelected(null)} onChanged={load} />}
    </div>
  )
}

function CustomerDetail({ customer, onClose, onChanged }: { customer: CustomerRow; onClose: () => void; onChanged: () => void }) {
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function adjust(positive: boolean) {
    const n = Number(amount)
    if (!Number.isFinite(n) || n === 0) return
    setSaving(true); setMsg(null)
    const res = await fetch('/api/admin/credits', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: customer.phone, amount: positive ? Math.abs(n) : -Math.abs(n), note }),
    })
    const data = await res.json()
    if (res.ok) {
      setMsg(`New balance: ${formatCurrency(data.balance)}`)
      setAmount(''); setNote(''); onChanged()
    } else {
      setMsg(data.error || 'Failed')
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="bg-navy-card border border-white/10 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-qaranta text-2xl text-white uppercase">{customer.name}</h3>
            <p className="font-poppins text-white/40 text-xs">{customer.phone}</p>
          </div>
          <button onClick={onClose} className="font-poppins text-white/40 text-xl hover:text-white">×</button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          <Stat label="Sessions" value={String(customer.sessions)} />
          <Stat label="Attended" value={String(customer.attended)} accent="text-green-400" />
          <Stat label="No-show" value={String(customer.noShow)} accent={customer.noShow > 0 ? 'text-red-400' : 'text-white'} />
          <Stat label="Cancels" value={String(customer.cancels.total)} />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <Stat label="Outstanding" value={formatCurrency(customer.outstanding)} accent={customer.outstanding > 0 ? 'text-amber-300' : 'text-white'} />
          <Stat label="Credit balance" value={formatCurrency(customer.creditBalance)} accent="text-orange" />
        </div>

        <div className="border-t border-white/8 pt-4">
          <p className="font-poppins text-white/60 text-xs uppercase tracking-wider mb-2">Adjust credit</p>
          <input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (PKR)"
            className="w-full bg-navy border border-white/10 rounded-xl px-3 py-2 font-poppins text-sm text-white placeholder:text-white/25 outline-none focus:border-orange/50 mb-2" />
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional, e.g. 'Goodwill for no-show on 12 May')"
            className="w-full bg-navy border border-white/10 rounded-xl px-3 py-2 font-poppins text-sm text-white placeholder:text-white/25 outline-none focus:border-orange/50 mb-3" />
          <div className="flex gap-2">
            <button onClick={() => adjust(true)} disabled={saving || !amount}
              className="flex-1 font-poppins text-xs font-semibold py-2 rounded-lg bg-green-500/15 border border-green-500/30 hover:bg-green-500/25 text-green-300 disabled:opacity-50">+ Add credit</button>
            <button onClick={() => adjust(false)} disabled={saving || !amount}
              className="flex-1 font-poppins text-xs font-semibold py-2 rounded-lg bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-300 disabled:opacity-50">– Deduct credit</button>
          </div>
          {msg && <p className="font-poppins text-orange text-xs mt-3">{msg}</p>}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// BOOKING CARD — shared row across Today / Outstanding
// ─────────────────────────────────────────────────────────────

function BookingCard({ booking, onUpdate, mode }: { booking: Booking; onUpdate: (b: Booking) => void; mode: 'today' | 'outstanding' }) {
  const [busy, setBusy] = useState(false)
  const [expand, setExpand] = useState(false)
  const owed = booking.grandTotal - booking.paidAmount - booking.creditApplied

  async function setAttendance(attendance: Attendance) {
    setBusy(true)
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attendance }),
      })
      const data = await res.json()
      if (res.ok && data.booking) {
        onUpdate({ ...booking, attendance, cancelledAt: data.booking.cancelled_at ?? booking.cancelledAt, cancelledBy: data.booking.cancelled_by ?? booking.cancelledBy, status: attendance === 'cancelled' ? 'cancelled' : booking.status })
      } else if (data.error) alert(data.error)
    } finally { setBusy(false) }
  }

  const borderColor =
    booking.attendance === 'cancelled' ? 'border-white/5 opacity-60' :
    booking.attendance === 'attended' ? 'border-green-500/15' :
    booking.attendance === 'no_show' ? 'border-red-500/20' :
    owed > 0 ? 'border-amber-400/20' : 'border-white/8'

  return (
    <div className={`bg-navy-card border rounded-2xl transition-colors ${borderColor}`}>
      <div className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 min-w-0">
            <Field label="Slot" value={`Box ${booking.court} · ${formatTime(booking.startTime)}`} sub={formatDate(booking.date)} />
            <Field label="Customer" value={booking.name} sub={`${booking.phone}${booking.email ? ' · ' + booking.email : ''}`} truncate />
            <Field
              label="Money"
              value={`${formatCurrency(booking.paidAmount)} / ${formatCurrency(booking.grandTotal)}`}
              sub={booking.creditApplied > 0 ? `Credit ${formatCurrency(booking.creditApplied)}` : owed > 0 ? `Owes ${formatCurrency(owed)}` : 'Paid'}
              accent={owed > 0 ? 'text-amber-300' : 'text-green-400'}
            />
            <Field label="Status" value={attendanceLabel(booking.attendance)} sub={booking.ref} accent={attendanceColor(booking.attendance)} />
          </div>
          <div className="flex gap-2 shrink-0 flex-wrap">
            {booking.attendance === 'booked' && (
              <>
                <ActionBtn label="✓ Attended" tone="green" onClick={() => setAttendance('attended')} busy={busy} />
                <ActionBtn label="✗ No-show" tone="red" onClick={() => setAttendance('no_show')} busy={busy} />
              </>
            )}
            {booking.attendance === 'attended' && (
              <ActionBtn label="↶ Mark no-show" tone="red" onClick={() => setAttendance('no_show')} busy={busy} />
            )}
            {booking.attendance === 'no_show' && (
              <ActionBtn label="↶ Mark attended" tone="green" onClick={() => setAttendance('attended')} busy={busy} />
            )}
            {booking.attendance !== 'cancelled' && (
              <ActionBtn label="Cancel" tone="muted" onClick={() => { if (confirm('Cancel this booking? Cancellation credit will be issued per tier.')) setAttendance('cancelled') }} busy={busy} />
            )}
            <button onClick={() => setExpand(!expand)} className="font-poppins text-xs text-white/40 hover:text-white px-2">
              {expand ? '−' : 'Details'}
            </button>
          </div>
        </div>

        {mode === 'outstanding' && booking.attendance === 'attended' && owed > 0 && (
          <div className="mt-3 pt-3 border-t border-white/8">
            <WhatsAppReminder booking={booking} owed={owed} />
          </div>
        )}
      </div>

      {expand && (
        <div className="border-t border-white/8 px-5 py-4 bg-navy/50 space-y-4">
          <PaymentEntry booking={booking} onUpdate={onUpdate} />
          <ExtrasEntry booking={booking} onUpdate={onUpdate} />
          <AdminNoteEntry booking={booking} onUpdate={onUpdate} />
        </div>
      )}
    </div>
  )
}

function attendanceLabel(a: Attendance): string {
  return a === 'booked' ? 'Booked' : a === 'attended' ? 'Attended' : a === 'no_show' ? 'No-show' : 'Cancelled'
}
function attendanceColor(a: Attendance): string {
  return a === 'attended' ? 'text-green-400' : a === 'no_show' ? 'text-red-400' : a === 'cancelled' ? 'text-white/40' : 'text-amber-300'
}

function ActionBtn({ label, tone, onClick, busy }: { label: string; tone: 'green'|'red'|'muted'; onClick: () => void; busy: boolean }) {
  const cls = tone === 'green' ? 'bg-green-500/15 border-green-500/30 hover:bg-green-500/25 text-green-300' :
              tone === 'red' ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 text-red-300' :
              'bg-white/5 border-white/10 hover:border-red-400/30 hover:text-red-400 text-white/50'
  return (
    <button onClick={onClick} disabled={busy} className={`font-poppins text-xs font-semibold px-3 py-2 rounded-xl border transition-colors disabled:opacity-50 ${cls}`}>
      {busy ? '…' : label}
    </button>
  )
}

// ── Inline payment entry ──
function PaymentEntry({ booking, onUpdate }: { booking: Booking; onUpdate: (b: Booking) => void }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<'bank'|'cash'|'online'|'on_account'>('cash')
  const [busy, setBusy] = useState(false)
  const owed = booking.grandTotal - booking.paidAmount - booking.creditApplied

  async function submit() {
    const n = Number(amount)
    if (!Number.isFinite(n) || n <= 0) return
    setBusy(true)
    const res = await fetch(`/api/bookings/${booking.id}/payments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: n, method }),
    })
    const data = await res.json()
    if (res.ok) {
      onUpdate({ ...booking, paidAmount: data.paidAmount })
      setAmount('')
    } else alert(data.error || 'Payment failed')
    setBusy(false)
  }

  return (
    <div>
      <p className="font-poppins text-white/50 text-[11px] uppercase tracking-wider mb-2">Add payment{owed > 0 ? ` · ${formatCurrency(owed)} owed` : ''}</p>
      <div className="flex gap-2 flex-wrap">
        <input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount"
          className="bg-navy border border-white/10 rounded-lg px-3 py-2 font-poppins text-sm text-white placeholder:text-white/25 outline-none focus:border-orange/50 w-32" />
        <select value={method} onChange={e => setMethod(e.target.value as 'bank'|'cash'|'online'|'on_account')}
          className="bg-navy border border-white/10 rounded-lg px-3 py-2 font-poppins text-sm text-white outline-none focus:border-orange/50">
          <option value="cash">Cash</option>
          <option value="bank">Bank</option>
          <option value="online">Online</option>
          <option value="on_account">On account</option>
        </select>
        <button onClick={() => { setAmount(String(owed)); }} disabled={owed <= 0}
          className="font-poppins text-xs text-white/50 hover:text-white px-2 disabled:opacity-40">Owed</button>
        <button onClick={submit} disabled={busy || !amount}
          className="font-poppins text-xs font-semibold px-3 py-2 rounded-lg bg-orange hover:bg-orange-dark text-white disabled:opacity-50">
          {busy ? '…' : 'Add'}
        </button>
      </div>
    </div>
  )
}

// ── Inline extras entry (Phase 1.5) ──
function ExtrasEntry({ booking, onUpdate }: { booking: Booking; onUpdate: (b: Booking) => void }) {
  const [value, setValue] = useState(String(booking.extrasTotal))
  const [busy, setBusy] = useState(false)

  async function submit() {
    const n = Number(value)
    if (!Number.isFinite(n) || n < 0) return
    setBusy(true)
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ extras_total: n }),
    })
    const data = await res.json()
    if (res.ok) onUpdate({ ...booking, extrasTotal: n, grandTotal: booking.courtTotal + n })
    else alert(data.error || 'Update failed')
    setBusy(false)
  }

  return (
    <div>
      <p className="font-poppins text-white/50 text-[11px] uppercase tracking-wider mb-2">Extras (drinks / snacks)</p>
      <div className="flex gap-2 items-center">
        <input type="number" inputMode="numeric" min={0} value={value} onChange={e => setValue(e.target.value)}
          className="bg-navy border border-white/10 rounded-lg px-3 py-2 font-poppins text-sm text-white outline-none focus:border-orange/50 w-32" />
        <button onClick={submit} disabled={busy} className="font-poppins text-xs font-semibold px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-orange/30 text-white/70 disabled:opacity-50">
          {busy ? '…' : 'Save'}
        </button>
        <span className="font-poppins text-white/40 text-xs">→ Grand total {formatCurrency(booking.courtTotal + Number(value || 0))}</span>
      </div>
    </div>
  )
}

// ── Inline admin note ──
function AdminNoteEntry({ booking, onUpdate }: { booking: Booking; onUpdate: (b: Booking) => void }) {
  const [value, setValue] = useState(booking.adminNote ?? '')
  const [busy, setBusy] = useState(false)
  async function submit() {
    setBusy(true)
    const res = await fetch(`/api/bookings/${booking.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ admin_note: value || null }),
    })
    if (res.ok) onUpdate({ ...booking, adminNote: value || undefined })
    setBusy(false)
  }
  return (
    <div>
      <p className="font-poppins text-white/50 text-[11px] uppercase tracking-wider mb-2">Admin note</p>
      <div className="flex gap-2">
        <input value={value} onChange={e => setValue(e.target.value)} placeholder="(visible only to admin)"
          className="flex-1 bg-navy border border-white/10 rounded-lg px-3 py-2 font-poppins text-sm text-white placeholder:text-white/25 outline-none focus:border-orange/50" />
        <button onClick={submit} disabled={busy} className="font-poppins text-xs font-semibold px-3 py-2 rounded-lg bg-white/5 border border-white/10 hover:border-orange/30 text-white/70 disabled:opacity-50">
          {busy ? '…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ── Tiny helpers ──

function WhatsAppReminder({ booking, owed }: { booking: Booking; owed: number }) {
  const msg = encodeURIComponent(
    `Hi ${booking.name}, just a reminder — ${formatCurrency(owed)} is outstanding for your ${formatDate(booking.date)} session (${formatTime(booking.startTime)}, Box ${booking.court}, ref ${booking.ref}). Let us know when you've sent it. Thanks!`
  )
  const phone = booking.phone.replace(/[^0-9]/g, '')
  const link = `https://wa.me/${phone}?text=${msg}`
  return (
    <a href={link} target="_blank" rel="noopener noreferrer" className="inline-block font-poppins text-xs font-semibold px-3 py-2 rounded-lg bg-green-600/15 border border-green-600/30 hover:bg-green-600/25 text-green-300">
      💬 Send WhatsApp reminder
    </a>
  )
}

function Field({ label, value, sub, accent, truncate }: { label: string; value: string; sub?: string; accent?: string; truncate?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="font-poppins text-white/35 text-[11px] uppercase tracking-wider">{label}</p>
      <p className={`font-poppins text-sm font-medium mt-0.5 ${accent ?? 'text-white'}`}>{value}</p>
      {sub && <p className={`font-poppins text-white/40 text-xs ${truncate ? 'truncate' : ''}`} title={sub}>{sub}</p>}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-navy-card border border-white/8 rounded-xl px-4 py-3">
      <p className="font-poppins text-white/40 text-[10px] uppercase tracking-widest">{label}</p>
      <p className={`font-qaranta text-2xl ${accent ?? 'text-white'} mt-0.5`}>{value}</p>
    </div>
  )
}

function Empty({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="text-center py-16">
      <p className="font-qaranta text-2xl text-white/20 uppercase mb-2">{title}</p>
      <p className="font-poppins text-white/30 text-sm">{sub}</p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// MATCH IQ (unchanged from previous)
// ─────────────────────────────────────────────────────────────

type PendingMatch = {
  id: string; played_on: string; court: string | null; start_time: string | null
  team1_score: number; team2_score: number; submitted_by: string; created_at: string
  p1: { id: string; name: string }; p2: { id: string; name: string }
  p3: { id: string; name: string }; p4: { id: string; name: string }
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
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
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
        <button onClick={load} className="font-poppins text-xs text-orange border border-orange/30 hover:border-orange px-3 py-2 rounded-xl">↻ Refresh</button>
      </div>
      {loading ? <Loading /> : pending.length === 0 ? (
        <Empty title="All clear" sub="No pending match submissions." />
      ) : (
        <div className="space-y-3">
          {pending.map(m => (
            <div key={m.id} className="bg-navy-card border border-amber-400/20 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-poppins text-white text-sm font-semibold">{m.p1.name} &amp; {m.p2.name}</span>
                    <span className="font-qaranta text-xl text-orange">{m.team1_score}</span>
                    <span className="font-poppins text-white/30 text-xs">vs</span>
                    <span className="font-qaranta text-xl text-white/50">{m.team2_score}</span>
                    <span className="font-poppins text-white/50 text-sm">{m.p3.name} &amp; {m.p4.name}</span>
                  </div>
                  <p className="font-poppins text-white/30 text-xs">
                    Played {new Date(m.played_on).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {m.court && ` · Box ${m.court}`}{m.start_time && ` · ${formatTime(m.start_time)}`}
                    {' · '}Submitted by {m.submitted_by}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => act(m.id, 'approve')} disabled={acting === m.id} className="bg-green-500/15 border border-green-500/30 hover:bg-green-500/25 text-green-400 font-poppins text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-50">
                    {acting === m.id ? '...' : '✓ Approve'}
                  </button>
                  <button onClick={() => act(m.id, 'reject')} disabled={acting === m.id} className="bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-poppins text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-50">
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

