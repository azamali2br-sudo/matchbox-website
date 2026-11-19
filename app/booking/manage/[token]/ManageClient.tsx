'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  formatDate, formatTime, formatCurrency, formatClockPKT, WHATSAPP_NUMBER,
  BANK_DETAILS, hasBankDetails, TIME_SLOTS, DURATION_OPTIONS, getTotalPrice,
  doesBookingOverlapSlot, addHoursToTime, getTodayStr,
} from '@/lib/constants'

type ManageBooking = {
  ref: string
  court: 'A' | 'B'
  date: string
  startTime: string
  endTime: string
  durationHours: number
  name: string
  attendance: 'booked' | 'attended' | 'no_show' | 'cancelled'
  grandTotal: number
  paidAmount: number
  creditApplied: number
  hoursUntilSlot: number
  tierLabel: string
  tierPercent: number
  estimatedCredit: number
  priorReward: number
  netCreditChange: number
  isPast: boolean
  alreadyCancelled: boolean
  id: string
  extrasTotal: number
  amountOwed: number
  holdExpiresAt: string | null
  canReschedule: boolean
}

type CreditInfo = {
  balance: number
  creditApplied: number
  amountOwed: number
  maxApplicable: number
  canRedeem: boolean
}

export default function ManageClient({ token }: { token: string }) {
  const [booking, setBooking] = useState<ManageBooking | null>(null)
  const [credit, setCredit] = useState<CreditInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [redeemAmount, setRedeemAmount] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    fetch('/api/account/me?optional=1')
      .then(async r => setLoggedIn(r.ok && !!(await r.json()).account))
      .catch(() => {})
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [bRes, cRes] = await Promise.all([
        fetch(`/api/bookings/cancel/${token}`),
        fetch(`/api/bookings/redeem-credit/${token}`),
      ])
      const bData = await bRes.json()
      if (!bRes.ok) {
        setError(bData.error || 'Failed to load booking')
        return
      }
      setBooking(bData.booking)
      if (cRes.ok) {
        setCredit(await cRes.json())
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { load() }, [load])

  async function handleCancel() {
    setCancelling(true)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/cancel/${token}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Cancellation failed')
        return
      }
      setSuccessMessage(
        data.refundCredit > 0
          ? `Booking cancelled. ${formatCurrency(data.refundCredit)} credit added to your account.`
          : `Booking cancelled. No credit issued (${data.tierLabel}).`,
      )
      setShowCancelConfirm(false)
      await load()
    } finally {
      setCancelling(false)
    }
  }

  async function handleRedeem(amount: number) {
    if (amount <= 0) return
    setRedeeming(true)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/redeem-credit/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Redemption failed')
        return
      }
      setSuccessMessage(
        data.amountOwed === 0
          ? `${formatCurrency(data.applied)} credit applied — your booking is fully settled.`
          : `${formatCurrency(data.applied)} credit applied. ${formatCurrency(data.amountOwed)} still due.`,
      )
      setRedeemAmount('')
      await load()
    } finally {
      setRedeeming(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center px-4">
        <p className="font-poppins text-white/40 text-sm">Loading…</p>
      </div>
    )
  }

  if (error && !booking) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="font-qaranta text-3xl text-white mb-3 uppercase">Booking Not Found</h1>
          <p className="font-poppins text-white/50 text-sm mb-6">{error}</p>
          <Link href="/" className="font-poppins text-orange text-sm hover:underline">Return home</Link>
        </div>
      </div>
    )
  }

  if (!booking) return null

  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hi, I need help with booking ${booking.ref}`)}`
  const hoursStr = booking.hoursUntilSlot > 0
    ? `${booking.hoursUntilSlot.toFixed(1)} hours from now`
    : 'already started'

  return (
    <div className="min-h-screen bg-navy text-white pb-16">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-32 lg:pt-40">
        <Link href={loggedIn ? '/account#bookings' : '/'} className="font-poppins text-white/40 text-xs hover:text-white/70 mb-8 inline-block">{loggedIn ? '← My bookings' : '← Back to site'}</Link>

        <h1 className="font-qaranta text-4xl sm:text-5xl text-white mb-2 uppercase">Your Booking</h1>
        <p className="font-poppins text-white/50 text-sm mb-8">Booking ref <span className="font-mono font-semibold text-orange">{booking.ref}</span></p>

        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 mb-6">
            <p className="font-poppins text-green-300 text-sm">{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-6">
            <p className="font-poppins text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Booking summary */}
        <div className="bg-navy-card border border-white/8 rounded-2xl p-6 mb-6">
          <div className="grid grid-cols-2 gap-y-4 gap-x-6">
            <Field label="Court" value={`Box ${booking.court}`} />
            <Field label="Date" value={formatDate(booking.date)} />
            <Field label="Time" value={`${formatTime(booking.startTime)} – ${formatTime(booking.endTime)}`} />
            <Field label="Duration" value={`${booking.durationHours} hr`} />
            <Field label="Total" value={formatCurrency(booking.grandTotal)} />
            <Field label="Status" value={booking.alreadyCancelled ? 'Cancelled' : booking.isPast ? 'Past' : booking.amountOwed > 0 ? 'Pending payment' : 'Confirmed'} />
          </div>
        </div>

        {/* Payment — always reachable again, not just on the success screen / email */}
        {!booking.alreadyCancelled && !booking.isPast && booking.amountOwed > 0 && (
          <PaymentPanel booking={booking} />
        )}

        {/* Change time */}
        {!booking.alreadyCancelled && !booking.isPast && (
          booking.canReschedule ? (
            <ReschedulePanel
              token={token}
              booking={booking}
              onDone={async (msg) => { setSuccessMessage(msg); setError(null); await load(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
            />
          ) : (
            <div className="bg-navy-card border border-white/8 rounded-2xl p-6 mb-6">
              <h2 className="font-qaranta text-2xl text-white mb-2 uppercase">Change Time</h2>
              <p className="font-poppins text-white/50 text-sm">
                Paid bookings can be changed online up to 24 hours before the slot. To change this one, <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-orange hover:underline">WhatsApp us</a>.
              </p>
            </div>
          )
        )}

        {/* Credit panel */}
        {credit && !booking.alreadyCancelled && (
          <div className="bg-navy-card border border-white/8 rounded-2xl p-6 mb-6">
            <h2 className="font-qaranta text-2xl text-white mb-3 uppercase">Credit</h2>
            <div className="grid grid-cols-3 gap-3 mb-4 text-center">
              <Stat label="Balance" value={formatCurrency(credit.balance)} accent />
              <Stat label="Applied" value={formatCurrency(credit.creditApplied)} />
              <Stat label="Still owed" value={formatCurrency(credit.amountOwed)} />
            </div>
            {credit.canRedeem ? (
              <div>
                <p className="font-poppins text-white/50 text-xs mb-3">
                  Up to {formatCurrency(credit.maxApplicable)} can be applied to this booking.
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={credit.maxApplicable}
                    placeholder="Amount"
                    value={redeemAmount}
                    onChange={e => setRedeemAmount(e.target.value)}
                    className="flex-1 bg-navy border border-white/10 rounded-xl px-4 py-3 font-poppins text-sm text-white placeholder:text-white/25 outline-none focus:border-orange/50"
                  />
                  <button
                    onClick={() => handleRedeem(credit.maxApplicable)}
                    disabled={redeeming}
                    className="font-poppins text-xs font-semibold px-4 py-3 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 text-white/70 disabled:opacity-50"
                  >
                    Apply max
                  </button>
                  <button
                    onClick={() => handleRedeem(Number(redeemAmount))}
                    disabled={redeeming || !redeemAmount || Number(redeemAmount) <= 0}
                    className="font-poppins text-xs font-semibold px-4 py-3 rounded-xl bg-orange hover:bg-orange-dark text-white disabled:opacity-50"
                  >
                    {redeeming ? '…' : 'Apply'}
                  </button>
                </div>
              </div>
            ) : credit.balance > 0 && credit.amountOwed === 0 ? (
              <p className="font-poppins text-white/40 text-xs">This booking is fully settled — nothing more to redeem.</p>
            ) : credit.balance === 0 ? (
              <p className="font-poppins text-white/40 text-xs">No credit on this phone yet. Pay in full to earn 15% credit on your next booking.</p>
            ) : null}
          </div>
        )}

        {/* Cancel panel */}
        {!booking.alreadyCancelled && !booking.isPast && (
          <div className="bg-navy-card border border-white/8 rounded-2xl p-6 mb-6">
            <h2 className="font-qaranta text-2xl text-white mb-3 uppercase">Cancel Booking</h2>
            <p className="font-poppins text-white/50 text-sm mb-4">Slot is {hoursStr} ({booking.tierLabel}).</p>

            {/* Cancellation policy table — current tier highlighted */}
            <div className="mb-5">
              <p className="font-poppins text-white/40 text-[11px] uppercase tracking-wider mb-2">Cancellation policy</p>
              <div className="bg-navy border border-white/8 rounded-xl overflow-hidden">
                <TierRow when="24+ hours before slot" gets="100% credit" active={booking.hoursUntilSlot >= 24} />
                <TierRow when="2–24 hours before slot" gets="50% credit" active={booking.hoursUntilSlot >= 2 && booking.hoursUntilSlot < 24} />
                <TierRow when="< 2 hours / no-show" gets="No credit" active={booking.hoursUntilSlot < 2} bad />
              </div>
              <p className="font-poppins text-white/40 text-[11px] leading-relaxed mt-3">
                Refunds are issued as credit (90-day expiry), not cash.
                Any prepay reward earned on this booking is reversed on cancel.
              </p>
            </div>

            {/* Breakdown of what cancelling does to balance */}
            <div className="bg-navy border border-white/8 rounded-xl p-4 mb-5">
              <p className="font-poppins text-white/60 text-[11px] uppercase tracking-wider mb-3">If you cancel now</p>
              <LineItem label={`Refund (${Math.round(booking.tierPercent * 100)}% of ${formatCurrency(booking.paidAmount + booking.creditApplied)} value)`} value={`+ ${formatCurrency(booking.estimatedCredit)}`} positive />
              {booking.priorReward > 0 && (
                <LineItem label="Prepay reward reversed" value={`− ${formatCurrency(booking.priorReward)}`} negative />
              )}
              <div className="border-t border-white/10 mt-3 pt-3">
                <LineItem
                  label="Net change to credit balance"
                  value={`${booking.netCreditChange >= 0 ? '+' : '−'} ${formatCurrency(Math.abs(booking.netCreditChange))}`}
                  positive={booking.netCreditChange > 0}
                  negative={booking.netCreditChange < 0}
                  bold
                />
              </div>
              {credit && (
                <p className="font-poppins text-white/40 text-[11px] mt-3">
                  Balance after cancel: <span className="text-white/70">{formatCurrency(credit.balance + booking.netCreditChange)}</span>
                  <span className="text-white/30"> (currently {formatCurrency(credit.balance)})</span>
                </p>
              )}
            </div>

            {!showCancelConfirm ? (
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="font-poppins text-xs font-semibold px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-300"
                >
                  Cancel this booking
                </button>
                <a
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-poppins text-xs font-semibold px-4 py-3 rounded-xl bg-white/5 border border-white/15 hover:bg-white/10 text-white/70"
                >
                  WhatsApp us instead
                </a>
              </div>
            ) : (
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                <p className="font-poppins text-white text-sm mb-3">
                  Confirm cancellation? Net change to your credit balance will be{' '}
                  <strong className={booking.netCreditChange >= 0 ? 'text-orange' : 'text-red-400'}>
                    {booking.netCreditChange >= 0 ? '+' : '−'} {formatCurrency(Math.abs(booking.netCreditChange))}
                  </strong>.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="font-poppins text-xs font-semibold px-4 py-2.5 rounded-lg bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
                  >
                    {cancelling ? 'Cancelling…' : 'Yes, cancel'}
                  </button>
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    disabled={cancelling}
                    className="font-poppins text-xs font-semibold px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/70"
                  >
                    Keep booking
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {booking.isPast && !booking.alreadyCancelled && (
          <div className="bg-navy-card border border-white/8 rounded-2xl p-6 mb-6">
            <p className="font-poppins text-white/60 text-sm">This slot has already started or passed. For changes, please WhatsApp us.</p>
          </div>
        )}

        <p className="font-poppins text-white/30 text-xs text-center mt-8">
          Need help? <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-orange hover:underline">WhatsApp +{WHATSAPP_NUMBER}</a>
        </p>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-poppins text-white/35 text-xs uppercase tracking-wider">{label}</p>
      <p className="font-poppins text-white text-sm font-medium mt-0.5">{value}</p>
    </div>
  )
}

function TierRow({ when, gets, active, bad }: { when: string; gets: string; active: boolean; bad?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-4 py-2.5 ${active ? 'bg-orange/10 border-l-2 border-l-orange' : 'border-l-2 border-l-transparent'} ${active ? '' : 'border-b border-white/5 last:border-b-0'}`}>
      <span className={`font-poppins text-xs ${active ? 'text-white font-semibold' : 'text-white/50'}`}>{when}</span>
      <span className={`font-poppins text-xs font-semibold ${active ? (bad ? 'text-red-400' : 'text-orange') : 'text-white/40'}`}>{gets}</span>
    </div>
  )
}

function LineItem({ label, value, positive, negative, bold }: { label: string; value: string; positive?: boolean; negative?: boolean; bold?: boolean }) {
  const color = positive ? 'text-orange' : negative ? 'text-red-400' : 'text-white/70'
  return (
    <div className="flex items-center justify-between py-1">
      <span className={`font-poppins text-xs ${bold ? 'text-white font-semibold' : 'text-white/60'}`}>{label}</span>
      <span className={`font-poppins text-sm ${bold ? 'font-bold' : 'font-semibold'} ${color}`}>{value}</span>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-navy border border-white/8 rounded-xl px-3 py-3">
      <p className="font-poppins text-white/35 text-[10px] uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-qaranta text-lg ${accent ? 'text-orange' : 'text-white'}`}>{value}</p>
    </div>
  )
}

function CopyValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
      <div className="min-w-0">
        <p className="font-poppins text-white/40 text-[11px]">{label}</p>
        <p className="font-poppins text-white text-sm font-medium [overflow-wrap:anywhere]">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => { navigator.clipboard?.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) }).catch(() => {}) }}
        className="shrink-0 font-poppins text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-white/5 border border-white/12 hover:bg-white/10 text-white/70"
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </div>
  )
}

function PaymentPanel({ booking }: { booking: ManageBooking }) {
  const waText = `Hi! ${hasBankDetails() ? 'Payment screenshot for' : 'Please send payment details for'} booking ${booking.ref} (Box ${booking.court}, ${formatDate(booking.date)}, ${formatTime(booking.startTime)}–${formatTime(booking.endTime)})`
  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`
  const deadline = booking.holdExpiresAt ? formatClockPKT(booking.holdExpiresAt) : null
  return (
    <div className="bg-orange/8 border border-orange/25 rounded-2xl p-6 mb-6">
      <h2 className="font-qaranta text-2xl text-orange mb-2 uppercase">Complete Payment</h2>
      <p className="font-poppins text-white/70 text-sm mb-4">
        {hasBankDetails()
          ? <>Transfer <span className="text-white font-semibold">{formatCurrency(booking.amountOwed)}</span>, then send the screenshot on WhatsApp with your ref <span className="text-white font-semibold">{booking.ref}</span>.</>
          : <>To pay <span className="text-white font-semibold">{formatCurrency(booking.amountOwed)}</span>, WhatsApp us with your ref <span className="text-white font-semibold">{booking.ref}</span> and we&apos;ll send payment details.</>}
      </p>
      {hasBankDetails() && (
        <div className="bg-navy border border-white/8 rounded-xl px-4 py-1 mb-4">
          <CopyValue label="Bank" value={BANK_DETAILS.bankName} />
          <CopyValue label="Account title" value={BANK_DETAILS.accountTitle} />
          <CopyValue label="Account no" value={BANK_DETAILS.accountNumber} />
          <CopyValue label="IBAN" value={BANK_DETAILS.iban} />
          <CopyValue label="Amount" value={String(booking.amountOwed)} />
        </div>
      )}
      {deadline && (
        <p className="font-poppins text-amber-400/90 text-xs leading-relaxed mb-4">
          ⏱ Slot held until <span className="font-semibold text-amber-400">{deadline}</span>. It&apos;s released automatically if payment isn&apos;t received by then.
        </p>
      )}
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-poppins font-semibold text-sm py-3.5 rounded-xl transition-colors"
      >
        {hasBankDetails() ? 'Send payment screenshot' : 'WhatsApp us to pay'}
      </a>
    </div>
  )
}

type PublicBooking = { id: string; startTime: string; endTime: string }

function isClosedStart(time: string, hours: number): boolean {
  const [h, m] = time.split(':').map(Number)
  const start = h * 60 + m
  const end = start + Math.round(hours * 60)
  return start < 15 * 60 && end > 9 * 60
}

function ReschedulePanel({ token, booking, onDone }: { token: string; booking: ManageBooking; onDone: (msg: string) => void }) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(booking.date)
  const [court, setCourt] = useState<'A' | 'B'>(booking.court)
  const [duration, setDuration] = useState(booking.durationHours)
  const [taken, setTaken] = useState<PublicBooking[] | null>(null)
  const [start, setStart] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [now, setNow] = useState(0)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    fetch(`/api/bookings?date=${date}&court=${court}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setTaken(((d.bookings ?? []) as PublicBooking[]).filter(b => b.id !== booking.id)) })
      .catch(() => { if (!cancelled) setTaken([]) })
    return () => { cancelled = true }
  }, [open, date, court, booking.id])

  const startOk = (t: string) => {
    if (new Date(`${date}T${t}:00+05:00`).getTime() <= now) return false
    if (isClosedStart(t, duration)) return false
    const idx = TIME_SLOTS.indexOf(t)
    for (let i = 0; i < Math.round(duration * 2); i++) {
      const slot = TIME_SLOTS[(idx + i) % TIME_SLOTS.length]
      if ((taken ?? []).some(b => doesBookingOverlapSlot(b.startTime, b.endTime, slot))) return false
    }
    return true
  }
  const options = taken ? TIME_SLOTS.filter(startOk) : []
  const isCurrent = (t: string) => date === booking.date && court === booking.court && t === booking.startTime && duration === booking.durationHours
  const newTotal = start ? getTotalPrice(start, duration) + booking.extrasTotal : null
  const valueIn = booking.paidAmount + booking.creditApplied
  const owedAfter = newTotal !== null ? Math.max(0, newTotal - valueIn) : null

  async function save() {
    if (!start) return
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch(`/api/bookings/reschedule/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ court, date, startTime: start, durationHours: duration }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(data.error || `Could not change the booking (HTTP ${res.status})`); return }
      setOpen(false)
      onDone(
        `Booking moved to Box ${court}, ${formatDate(date)}, ${formatTime(start)}–${formatTime(addHoursToTime(start, duration))}.` +
        (data.creditReturned > 0 ? ` ${formatCurrency(data.creditReturned)} credit returned.` : '') +
        ' We\'ve emailed you the updated details.',
      )
    } catch {
      setErr('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <div className="bg-navy-card border border-white/8 rounded-2xl p-6 mb-6">
        <h2 className="font-qaranta text-2xl text-white mb-2 uppercase">Change Time</h2>
        <p className="font-poppins text-white/50 text-sm mb-4">
          Move to another time, day or court. Your booking ref stays the same{booking.amountOwed > 0 && booking.holdExpiresAt ? ' and the payment deadline does not change' : ''}.
        </p>
        <button
          onClick={() => { setNow(Date.now()); setTaken(null); setStart(null); setOpen(true) }}
          className="font-poppins text-xs font-semibold px-4 py-3 rounded-xl bg-orange hover:bg-orange-dark text-white"
        >
          Change time
        </button>
      </div>
    )
  }

  return (
    <div className="bg-navy-card border border-orange/30 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-qaranta text-2xl text-white uppercase">Change Time</h2>
        <button onClick={() => setOpen(false)} className="font-poppins text-white/40 hover:text-white text-xs">Close</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <label className="block">
          <span className="font-poppins text-white/40 text-[11px] uppercase tracking-wider">Date</span>
          <input
            type="date"
            value={date}
            min={getTodayStr()}
            onChange={e => { if (e.target.value) { setDate(e.target.value); setTaken(null); setStart(null) } }}
            className="mt-1 w-full bg-navy border border-white/10 rounded-xl px-3 py-2.5 font-poppins text-sm text-white outline-none focus:border-orange/50 [color-scheme:dark]"
          />
        </label>
        <div>
          <span className="font-poppins text-white/40 text-[11px] uppercase tracking-wider">Court</span>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(['A', 'B'] as const).map(c => (
              <button key={c} type="button" onClick={() => { if (c !== court) { setCourt(c); setTaken(null); setStart(null) } }}
                className={`font-poppins text-sm font-semibold py-2.5 rounded-xl border transition-colors ${court === c ? 'bg-orange border-orange text-white' : 'bg-navy border-white/10 text-white/70 hover:border-orange/40'}`}>
                Box {c}
              </button>
            ))}
          </div>
        </div>
        <label className="block">
          <span className="font-poppins text-white/40 text-[11px] uppercase tracking-wider">Duration</span>
          <select
            value={duration}
            onChange={e => { setDuration(Number(e.target.value)); setStart(null) }}
            className="mt-1 w-full bg-navy border border-white/10 rounded-xl px-3 py-2.5 font-poppins text-sm text-white outline-none focus:border-orange/50"
          >
            {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d} hour{d !== 1 ? 's' : ''}</option>)}
          </select>
        </label>
      </div>

      <p className="font-poppins text-white/40 text-[11px] uppercase tracking-wider mb-2">Available start times</p>
      {taken === null ? (
        <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-orange/40 border-t-orange rounded-full animate-spin" /></div>
      ) : options.length === 0 ? (
        <p className="font-poppins text-white/40 text-sm py-3">No free {duration}-hour slots on Box {court} that day. Try another day, court or duration.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-5">
          {options.map(t => (
            <button key={t} type="button" disabled={isCurrent(t)} onClick={() => setStart(t)}
              className={`font-poppins text-xs font-semibold py-2.5 rounded-lg border transition-colors disabled:opacity-40 ${start === t ? 'bg-orange border-orange text-white' : 'bg-navy border-white/10 text-white/80 hover:border-orange/40'}`}>
              {formatTime(t)}{isCurrent(t) ? ' · now' : ''}
            </button>
          ))}
        </div>
      )}

      {start && newTotal !== null && owedAfter !== null && (
        <div className="bg-navy border border-white/8 rounded-xl p-4 mb-4">
          <p className="font-poppins text-white text-sm font-medium mb-1">
            Box {court} · {formatDate(date)} · {formatTime(start)} – {formatTime(addHoursToTime(start, duration))}
          </p>
          <p className="font-poppins text-white/50 text-xs">
            New total {formatCurrency(newTotal)}
            {newTotal !== booking.grandTotal && <> (was {formatCurrency(booking.grandTotal)})</>}
            {valueIn > 0 && <> · {formatCurrency(valueIn)} already paid/credited</>}
            {' · '}<span className="text-white/80">{owedAfter > 0 ? `${formatCurrency(owedAfter)} to pay` : 'nothing to pay'}</span>
          </p>
        </div>
      )}

      {err && <p className="font-poppins text-red-400 text-xs mb-3">{err}</p>}

      <button
        onClick={save}
        disabled={!start || saving}
        className="w-full font-poppins text-sm font-semibold py-3.5 rounded-xl bg-orange hover:bg-orange-dark text-white disabled:opacity-40"
      >
        {saving ? 'Saving…' : 'Confirm new time'}
      </button>
    </div>
  )
}
