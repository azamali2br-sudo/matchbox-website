'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { formatDate, formatTime, formatCurrency, WHATSAPP_NUMBER } from '@/lib/constants'

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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-12">
        <Link href="/" className="font-poppins text-white/40 text-xs hover:text-white/70 mb-8 inline-block">← Back to site</Link>

        <h1 className="font-qaranta text-4xl sm:text-5xl text-white mb-2 uppercase">Your Booking</h1>
        <p className="font-poppins text-white/40 text-sm mb-8">Ref · <span className="font-mono text-white/70">{booking.ref}</span></p>

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
            <Field label="Status" value={booking.alreadyCancelled ? 'Cancelled' : booking.isPast ? 'Past' : 'Active'} />
          </div>
        </div>

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
