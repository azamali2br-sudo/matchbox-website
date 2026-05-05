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

// Slots shown in the UI — 1-hour blocks from 6 AM through 5 AM next day
export const TIME_SLOTS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
]

export function isPeakHour(time: string): boolean {
  const hour = parseInt(time.split(':')[0])
  return hour >= 18 || hour < 6
}

export function getPricePerHour(time: string): number {
  return isPeakHour(time) ? PEAK_PRICE_PER_HOUR : OFF_PEAK_PRICE_PER_HOUR
}

export function getTotalPrice(startTime: string, durationHours: number): number {
  return getPricePerHour(startTime) * durationHours
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

// Normalize time to minutes past midnight, treating booking day as starting at 6 AM
export function timeToNormalizedMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  const totalMinutes = h * 60 + m
  // Shift so 6 AM = 0, 5:59 AM next day = 1439
  const shifted = totalMinutes < 6 * 60 ? totalMinutes + 24 * 60 : totalMinutes
  return shifted - 6 * 60
}

export function addHoursToTime(time: string, hours: number): string {
  const [h, m] = time.split(':').map(Number)
  const totalMinutes = (h * 60 + m + Math.round(hours * 60)) % (24 * 60)
  const newH = Math.floor(totalMinutes / 60)
  const newM = totalMinutes % 60
  return `${newH.toString().padStart(2, '0')}:${newM.toString().padStart(2, '0')}`
}

export function doesBookingOverlapSlot(
  bookingStart: string,
  bookingEnd: string,
  slotStart: string,
): boolean {
  const bs = timeToNormalizedMinutes(bookingStart)
  const be = timeToNormalizedMinutes(bookingEnd)
  const ss = timeToNormalizedMinutes(slotStart)
  const se = ss + 60
  return bs < se && be > ss
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-PK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

export function getDateStr(daysFromToday: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  return d.toISOString().split('T')[0]
}

export function generateBookingRef(): string {
  return 'MBX-' + Math.random().toString(36).toUpperCase().slice(2, 8)
}
