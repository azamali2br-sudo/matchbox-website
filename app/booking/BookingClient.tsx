'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  TIME_SLOTS,
  DURATION_OPTIONS,
  formatTime,
  formatCurrency,
  formatDate,
  getTodayStr,
  getDateStr,
  isPeakHour,
  getPricePerHour,
  getTotalPrice,
  doesBookingOverlapSlot,
  addHoursToTime,
  WHATSAPP_LINK,
  BANK_DETAILS,
  generateBookingRef,
} from '@/lib/constants'
import type { Booking } from '@/lib/mock-data'

type SlotStatus = 'available' | 'pending' | 'confirmed'
type Step = 'calendar' | 'form' | 'success'

interface SlotInfo {
  time: string
  status: SlotStatus
}

interface SuccessData {
  ref: string
  court: string
  date: string
  startTime: string
  endTime: string
  durationHours: number
  name: string
  totalPrice: number
  holdExpiresAt: string
}

export default function BookingClient() {
  const [court, setCourt] = useState<'A' | 'B'>('A')
  const [date, setDate] = useState(getTodayStr())
  const [slots, setSlots] = useState<SlotInfo[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [duration, setDuration] = useState(1)
  const [step, setStep] = useState<Step>('calendar')
  const [successData, setSuccessData] = useState<SuccessData | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [demoMode, setDemoMode] = useState(false)

  const fetchSlots = useCallback(async () => {
    setLoadingSlots(true)
    setSelectedSlot(null)
    try {
      const res = await fetch(`/api/bookings?date=${date}&court=${court}`)
      const data = await res.json()
      if (data.demoMode) setDemoMode(true)

      const bookings: Booking[] = data.bookings || []
      const computed: SlotInfo[] = TIME_SLOTS.map(time => {
        const overlap = bookings.find(b =>
          doesBookingOverlapSlot(b.startTime, b.endTime, time)
        )
        return {
          time,
          status: overlap
            ? overlap.status === 'confirmed'
              ? 'confirmed'
              : 'pending'
            : 'available',
        }
      })
      setSlots(computed)
    } catch {
      setSlots(TIME_SLOTS.map(time => ({ time, status: 'available' })))
    } finally {
      setLoadingSlots(false)
    }
  }, [date, court])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  function isSlotRangeAvailable(startTime: string, hours: number): boolean {
    const steps = Math.round(hours * 2) // number of 30-min steps needed (we check 1-hr slots)
    const startIdx = TIME_SLOTS.indexOf(startTime)
    if (startIdx === -1) return false
    // Check each 1-hr slot that the booking would cover
    for (let i = 0; i < Math.ceil(hours); i++) {
      const slotTime = TIME_SLOTS[(startIdx + i) % TIME_SLOTS.length]
      const slotInfo = slots.find(s => s.time === slotTime)
      if (slotInfo && slotInfo.status !== 'available') return false
    }
    return true
  }

  function handleSlotClick(time: string) {
    const slotInfo = slots.find(s => s.time === time)
    if (!slotInfo || slotInfo.status !== 'available') return
    setSelectedSlot(time)
    // Reset duration if new slot can't support current duration
    if (!isSlotRangeAvailable(time, duration)) setDuration(1)
  }

  function handleDateNav(delta: number) {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    setDate(d.toISOString().split('T')[0])
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    if (!form.email.trim()) e.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    if (!selectedSlot) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          court,
          date,
          startTime: selectedSlot,
          durationHours: duration,
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setSuccessData({
        ref: data.booking.ref,
        court,
        date,
        startTime: selectedSlot,
        endTime: addHoursToTime(selectedSlot, duration),
        durationHours: duration,
        name: form.name.trim(),
        totalPrice: getTotalPrice(selectedSlot, duration),
        holdExpiresAt: data.booking.holdExpiresAt,
      })
      setStep('success')
    } catch {
      setErrors({ submit: 'Something went wrong. Please try WhatsApp instead.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'success' && successData) {
    return <SuccessScreen data={successData} onBookAnother={() => {
      setStep('calendar')
      setSelectedSlot(null)
      setForm({ name: '', phone: '', email: '' })
      setErrors({})
      fetchSlots()
    }} />
  }

  const price = selectedSlot ? getTotalPrice(selectedSlot, duration) : null
  const endTime = selectedSlot ? addHoursToTime(selectedSlot, duration) : null

  function getBookingRateType(startTime: string, dur: number): 'peak' | 'off-peak' | 'mixed' {
    let hasPeak = false, hasOffPeak = false
    let current = startTime
    const steps = Math.round(dur * 2)
    for (let i = 0; i < steps; i++) {
      if (isPeakHour(current)) hasPeak = true
      else hasOffPeak = true
      current = addHoursToTime(current, 0.5)
    }
    if (hasPeak && hasOffPeak) return 'mixed'
    return hasPeak ? 'peak' : 'off-peak'
  }

  const rateType = selectedSlot ? getBookingRateType(selectedSlot, duration) : null
  const isToday = date === getTodayStr()
  const minDate = getTodayStr()
  const maxDate = getDateStr(30)

  return (
    <div className="min-h-screen bg-navy pt-28">
      {demoMode && (
        <div className="bg-orange/10 border-b border-orange/20 px-6 py-2 text-center">
          <span className="font-poppins text-orange text-xs">
            Demo mode — bookings are not persisted.{' '}
            <Link href="/admin" className="underline">Connect Supabase</Link> to go live.
          </span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <p className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest mb-3">
            Matchbox Padel Club
          </p>
          <h1 className="font-qaranta text-4xl md:text-5xl lg:text-6xl text-white uppercase leading-tight">
            Book a Court
          </h1>
          <p className="font-poppins text-white/50 text-sm mt-3">
            Off-peak PKR 1,500/hr (6 AM–6 PM) · Peak PKR 3,250/hr (6 PM–6 AM) · 1 hour minimum
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-8 items-start">
          {/* Left: Court + Date + Slots */}
          <div>
            {/* Court tabs */}
            <div className="flex gap-2 mb-6">
              {(['A', 'B'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => { setCourt(c); setSelectedSlot(null) }}
                  className={`flex-1 py-3.5 rounded-2xl font-poppins font-semibold text-sm transition-all duration-200 ${
                    court === c
                      ? 'bg-orange text-white shadow-lg shadow-orange/25'
                      : 'bg-navy-card border border-white/8 text-white/60 hover:border-orange/30 hover:text-white'
                  }`}
                >
                  Box {c}
                  {c === 'A' && <span className="ml-2 text-xs opacity-70">Most Popular</span>}
                  {c === 'B' && <span className="ml-2 text-xs opacity-70">Hidden Gem</span>}
                </button>
              ))}
            </div>

            {/* Date navigation */}
            <div className="flex items-center gap-3 mb-6 bg-navy-card rounded-2xl border border-white/8 p-3">
              <button
                onClick={() => handleDateNav(-1)}
                disabled={date <= minDate}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="flex-1 text-center">
                <input
                  type="date"
                  value={date}
                  min={minDate}
                  max={maxDate}
                  onChange={e => setDate(e.target.value)}
                  className="sr-only"
                  id="date-input"
                />
                <label htmlFor="date-input" className="cursor-pointer">
                  <p className="font-poppins text-white font-medium text-sm">
                    {isToday ? 'Today — ' : ''}{formatDate(date)}
                  </p>
                </label>
              </div>

              <button
                onClick={() => handleDateNav(1)}
                disabled={date >= maxDate}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-x-4 gap-y-2 sm:gap-5 mb-5">
              {[
                { color: 'bg-white/40', label: 'Available' },
                { color: 'bg-orange', label: 'Peak hour' },
                { color: 'bg-amber-400/80', label: 'Pending payment' },
                { color: 'bg-red-500/70', label: 'Taken' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                  <span className="font-poppins text-white/40 text-xs">{label}</span>
                </div>
              ))}
            </div>

            {/* Slot grid */}
            {loadingSlots ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map(({ time, status }) => {
                  const isSelected = selectedSlot === time
                  const isPeak = isPeakHour(time)
                  const isUnavailable = status !== 'available'

                  let bg = 'bg-navy-card border border-white/8 hover:border-orange/40 cursor-pointer'
                  if (isSelected) bg = 'bg-orange border border-orange shadow-lg shadow-orange/30 cursor-pointer'
                  else if (status === 'pending') bg = 'bg-amber-400/10 border border-amber-400/30 cursor-not-allowed'
                  else if (status === 'confirmed') bg = 'bg-red-500/10 border border-red-500/20 cursor-not-allowed'

                  return (
                    <button
                      key={time}
                      onClick={() => handleSlotClick(time)}
                      disabled={isUnavailable}
                      className={`relative rounded-xl p-3 text-left transition-all duration-150 ${bg}`}
                    >
                      <p className={`font-poppins font-semibold text-sm leading-none ${
                        isSelected ? 'text-white' : isUnavailable ? 'text-white/25' : 'text-white'
                      }`}>
                        {formatTime(time)}
                      </p>
                      <p className={`font-poppins text-xs mt-1 ${
                        isSelected ? 'text-white/80' : isUnavailable ? 'text-white/20' : 'text-white/70'
                      }`}>
                        {isUnavailable
                          ? status === 'pending' ? 'Pending' : 'Taken'
                          : isPeak ? 'PKR 3,250' : 'PKR 1,500'
                        }
                      </p>
                      {isPeak && !isUnavailable && (
                        <div className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : 'bg-orange'}`} title="Peak hour" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: Form panel */}
          <div className="lg:sticky lg:top-28">
            {!selectedSlot ? (
              <div className="bg-navy-card rounded-3xl border border-white/8 p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-orange/10 border border-orange/20 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-7 h-7 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="font-qaranta text-2xl text-white uppercase mb-3">Select a Time Slot</h3>
                <p className="font-poppins text-white/45 text-sm leading-relaxed mb-8">
                  Pick an available time on the left to start your booking.
                </p>
                <div className="pt-6 border-t border-white/8">
                  <p className="font-poppins text-white/30 text-xs mb-3">Need help? Book on WhatsApp</p>
                  <a
                    href={WHATSAPP_LINK}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-orange font-poppins font-semibold text-sm hover:underline"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    +92 322 217 2629
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-navy-card rounded-3xl border border-orange/20 overflow-hidden">
                {/* Slot summary header */}
                <div className="bg-orange/10 border-b border-orange/15 px-6 py-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest">
                      Box {court} · {formatDate(date)}
                    </span>
                    <button
                      onClick={() => setSelectedSlot(null)}
                      className="text-white/40 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="font-qaranta text-white text-2xl">
                    {formatTime(selectedSlot)}
                    {endTime && <span className="text-white/50"> → {formatTime(endTime)}</span>}
                  </p>
                </div>

                <div className="p-6">
                  {/* Duration selector */}
                  <div className="mb-6">
                    <p className="font-poppins text-white/50 text-xs uppercase tracking-widest mb-3">Duration</p>
                    <div className="flex flex-wrap gap-2">
                      {DURATION_OPTIONS.map(d => {
                        const canSelect = isSlotRangeAvailable(selectedSlot, d)
                        return (
                          <button
                            key={d}
                            onClick={() => canSelect && setDuration(d)}
                            disabled={!canSelect}
                            className={`px-3 py-2 rounded-xl font-poppins text-sm font-medium transition-all ${
                              duration === d
                                ? 'bg-orange text-white'
                                : canSelect
                                  ? 'bg-white/5 border border-white/10 text-white hover:border-orange/40'
                                  : 'bg-white/3 border border-white/5 text-white/20 cursor-not-allowed'
                            }`}
                          >
                            {d}hr
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Price */}
                  {price !== null && (
                    <div className="bg-navy rounded-2xl p-4 mb-6 flex items-center justify-between">
                      <div>
                        <p className="font-poppins text-white/40 text-xs">Total</p>
                        <p className="font-qaranta text-3xl text-orange mt-0.5">{formatCurrency(price)}</p>
                      </div>
                      <div className="text-right">
                        {rateType === 'mixed' ? (
                          <>
                            <p className="font-poppins text-white/40 text-xs">Mixed rate</p>
                            <p className="font-poppins text-xs mt-1 text-orange/70">⚡ Peak + 🌤 Off-peak</p>
                          </>
                        ) : (
                          <>
                            <p className="font-poppins text-white/40 text-xs">{formatCurrency(getPricePerHour(selectedSlot))}/hr</p>
                            <p className="font-poppins text-xs mt-1 text-orange/70">
                              {rateType === 'peak' ? '⚡ Peak' : '🌤 Off-peak'}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Booking form */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {(['name', 'phone', 'email'] as const).map(field => (
                      <div key={field}>
                        <input
                          type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                          placeholder={field === 'name' ? 'Full Name' : field === 'phone' ? 'Phone Number (e.g. 0322...)' : 'Email Address'}
                          value={form[field]}
                          onChange={e => {
                            setForm(prev => ({ ...prev, [field]: e.target.value }))
                            if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
                          }}
                          className={`w-full bg-navy border rounded-xl px-4 py-3 font-poppins text-sm text-white placeholder:text-white/25 outline-none focus:border-orange/50 transition-colors ${
                            errors[field] ? 'border-red-400/60' : 'border-white/10'
                          }`}
                        />
                        {errors[field] && (
                          <p className="font-poppins text-red-400 text-xs mt-1">{errors[field]}</p>
                        )}
                      </div>
                    ))}

                    {errors.submit && (
                      <p className="font-poppins text-red-400 text-xs">{errors.submit}</p>
                    )}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-orange hover:bg-orange-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-poppins font-semibold text-sm py-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-orange/25"
                    >
                      {submitting ? 'Confirming...' : 'Confirm Booking'}
                    </button>

                    <div className="bg-amber-400/8 border border-amber-400/20 rounded-xl px-4 py-3 text-center">
                      <p className="font-poppins text-amber-400/90 text-xs leading-relaxed">
                        ⏱ Your slot is held for <span className="font-semibold">30 minutes</span> after booking. Send payment within that window to keep it.
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SuccessScreen({ data, onBookAnother }: { data: SuccessData; onBookAnother: () => void }) {
  const holdUntil = data.holdExpiresAt
    ? new Date(data.holdExpiresAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null

  return (
    <div className="min-h-screen bg-navy pt-28 flex items-start justify-center">
      <div className="max-w-xl w-full mx-auto px-6 py-16">
        {/* Confirmed badge */}
        <div className="w-20 h-20 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center mx-auto mb-8">
          <svg className="w-9 h-9 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="font-qaranta text-5xl text-white uppercase text-center mb-2">Booked!</h1>
        <p className="font-poppins text-white/50 text-sm text-center mb-10">
          Ref: <span className="text-orange font-semibold">{data.ref}</span>
        </p>

        {/* Booking summary */}
        <div className="bg-navy-card rounded-3xl border border-white/8 p-6 mb-8">
          {[
            { label: 'Court', value: `Box ${data.court}` },
            { label: 'Date', value: formatDate(data.date) },
            { label: 'Time', value: `${formatTime(data.startTime)} → ${formatTime(data.endTime)}` },
            { label: 'Duration', value: `${data.durationHours} hour${data.durationHours !== 1 ? 's' : ''}` },
            { label: 'Name', value: data.name },
            { label: 'Total', value: formatCurrency(data.totalPrice) },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
              <span className="font-poppins text-white/40 text-sm">{label}</span>
              <span className="font-poppins text-white text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>

        {/* Payment instructions */}
        <div className="bg-orange/8 rounded-3xl border border-orange/20 p-6 mb-6">
          <h3 className="font-qaranta text-xl text-orange uppercase mb-4">Complete Payment</h3>
          <p className="font-poppins text-white/60 text-sm mb-5">
            Transfer <span className="text-white font-semibold">{formatCurrency(data.totalPrice)}</span> to the account below, then send your screenshot to WhatsApp to confirm your slot.
          </p>

          <div className="space-y-2 mb-6">
            {[
              { label: 'Bank', value: BANK_DETAILS.bankName },
              { label: 'Account Title', value: BANK_DETAILS.accountTitle },
              { label: 'Account / IBAN', value: BANK_DETAILS.iban },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="font-poppins text-white/40 text-xs">{label}</span>
                <span className="font-poppins text-white text-xs font-medium">{value}</span>
              </div>
            ))}
          </div>

          <a
            href={`${WHATSAPP_LINK}?text=Hi! I've booked Box ${data.court} on ${formatDate(data.date)} at ${formatTime(data.startTime)}. Ref: ${data.ref}. Sending payment screenshot now.`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white font-poppins font-semibold text-sm py-3.5 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Send Payment Screenshot
          </a>
        </div>

        {holdUntil && (
          <div className="bg-amber-400/8 border border-amber-400/25 rounded-2xl px-5 py-4 mb-6 flex items-center gap-3">
            <span className="text-amber-400 text-lg shrink-0">⏱</span>
            <p className="font-poppins text-amber-400/90 text-sm leading-relaxed">
              Slot held until <span className="font-semibold text-amber-400">{holdUntil}</span>. Send your payment screenshot before then — the slot releases automatically if we don't receive it.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onBookAnother}
            className="flex-1 border border-white/15 hover:border-orange/40 text-white font-poppins font-semibold text-sm py-3.5 rounded-xl transition-colors text-center"
          >
            Book Another
          </button>
          <Link
            href="/"
            className="flex-1 bg-orange hover:bg-orange-dark text-white font-poppins font-semibold text-sm py-3.5 rounded-xl transition-colors text-center"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
