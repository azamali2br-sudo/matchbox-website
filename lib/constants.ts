export const COURTS = ['A', 'B'] as const
export type Court = typeof COURTS[number]

export const PEAK_PRICE_PER_HOUR = 3250
export const OFF_PEAK_PRICE_PER_HOUR = 1500
export const MIN_BOOKING_HOURS = 1
export const BOOKING_INCREMENT = 0.5

export const WHATSAPP_NUMBER = '923222172629'
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`

export const BANK_DETAILS = {
  bankName: 'Meezan Bank',
  accountTitle: 'Matchbox Padel Club',
  accountNumber: '03222172629',
  iban: 'PK00MEZN0001234567890123',
}

export const DURATION_OPTIONS = [1, 1.5, 2, 2.5, 3]
export const HOLD_DURATION_MINUTES = 30

// Slots shown in the UI — 30-min granularity so non-integer-hour bookings
// (1.5hr, 2.5hr) don't leave invisible 30-min gaps. 48 slots/day.
export const TIME_SLOTS = Array.from({ length: 48 }, (_, i) => {
  const h = Math.floor(i / 2)
  const m = i % 2 === 0 ? '00' : '30'
  return `${h.toString().padStart(2, '0')}:${m}`
})

export function isPeakHour(time: string): boolean {
  const hour = parseInt(time.split(':')[0])
  return hour >= 18 || hour < 6
}

export function getPricePerHour(time: string): number {
  return isPeakHour(time) ? PEAK_PRICE_PER_HOUR : OFF_PEAK_PRICE_PER_HOUR
}

export function getTotalPrice(startTime: string, durationHours: number): number {
  let total = 0
  let current = startTime
  const steps = Math.round(durationHours * 2) // 30-min increments
  for (let i = 0; i < steps; i++) {
    total += getPricePerHour(current) * 0.5
    current = addHoursToTime(current, 0.5)
  }
  return total
}

export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`
}

export function formatCurrency(amount: number): string {
  return `PKR ${amount.toLocaleString()}`
}

export function timeToNormalizedMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number)
  const totalMinutes = (h * 60 + m + Math.round(hours * 60)) % (24 * 60)
  const newH = Math.floor(totalMinutes / 60)
  const newM = totalMinutes % 60
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`
}

// Slots are 30 minutes long. A booking overlaps a slot if any portion of
// the booking falls inside the slot's [start, start+30) range.
export const SLOT_DURATION_MINUTES = 30

export function doesBookingOverlapSlot(
  bookingStart: string,
  bookingEnd: string,
  slotStart: string,
): boolean {
  const bs = timeToNormalizedMinutes(bookingStart)
  let be = timeToNormalizedMinutes(bookingEnd)
  const ss = timeToNormalizedMinutes(slotStart)
  const se = ss + SLOT_DURATION_MINUTES
  if (be <= bs) be += 24 * 60 // handle bookings that cross midnight
  return bs < se && be > ss
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// Karachi-local YYYY-MM-DD. Using toISOString gives UTC, which silently shifts
// "today" by a day late at night in PKT (UTC+5). Use en-CA locale = ISO format.
export function getTodayStr(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
}

export function getDateStr(daysFromToday: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
}

export function generateBookingRef(): string {
  return 'MBX-' + Math.random().toString(36).toUpperCase().slice(2, 8)
}
