import { getDateStr } from './constants'

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled'
export type Attendance = 'booked' | 'attended' | 'no_show' | 'cancelled'
export type BookingSource = 'online' | 'admin' | 'whatsapp'
export type PaymentMethod = 'bank' | 'cash' | 'credit' | 'online' | 'on_account'

export interface Payment {
  id: string
  bookingId: string
  amount: number
  method: PaymentMethod
  paidAt: string
  note?: string
}

export interface Booking {
  id: string
  ref: string
  court: 'A' | 'B'
  date: string
  startTime: string
  endTime: string
  durationHours: number
  name: string
  phone: string
  email: string
  // Derived legacy status (for older UI). Source of truth = attendance + paidAmount.
  status: BookingStatus
  // New two-axis fields
  attendance: Attendance
  courtTotal: number
  extrasTotal: number
  grandTotal: number
  creditApplied: number
  paidAmount: number
  // Compat alias = grandTotal so existing components keep working
  totalPrice: number
  // Lifecycle
  holdExpiresAt?: string
  termsAcceptedAt?: string
  cancelToken?: string
  cancelledAt?: string
  cancelledBy?: 'customer' | 'admin'
  hoursBeforeSlotAtCancel?: number
  adminNote?: string
  source: BookingSource
  createdAt: string
  payments?: Payment[]
}

// Derive the legacy 3-state status from the two-axis fields. Credit counts as
// settlement value alongside paid_amount.
export function deriveStatus(b: {
  attendance: Attendance
  paidAmount: number
  creditApplied?: number
  grandTotal: number
}): BookingStatus {
  if (b.attendance === 'cancelled') return 'cancelled'
  if (b.attendance === 'no_show' || b.attendance === 'attended') return 'confirmed'
  const settled = b.paidAmount + (b.creditApplied ?? 0)
  return settled >= b.grandTotal && b.grandTotal > 0 ? 'confirmed' : 'pending'
}

// ── Demo mode (kept for local dev without Supabase). New fields default sensibly. ──

function demo(b: Partial<Booking> & {
  id: string
  court: 'A' | 'B'
  date: string
  startTime: string
  endTime: string
  durationHours: number
  name: string
  phone: string
  email: string
  status: BookingStatus
  totalPrice: number
  ref: string
}): Booking {
  const attendance: Attendance = b.status === 'cancelled' ? 'cancelled' : 'booked'
  const paidAmount = b.status === 'confirmed' ? b.totalPrice : 0
  return {
    ...b,
    attendance,
    courtTotal: b.totalPrice,
    extrasTotal: 0,
    grandTotal: b.totalPrice,
    creditApplied: 0,
    paidAmount,
    source: 'online',
    createdAt: b.createdAt ?? new Date().toISOString(),
  }
}

export const MOCK_BOOKINGS: Booking[] = [
  demo({ id: '1', court: 'A', date: getDateStr(0), startTime: '08:00', endTime: '10:00', durationHours: 2, name: 'Ali Hassan', phone: '+923001234567', email: 'ali@example.com', status: 'confirmed', totalPrice: 3000, ref: 'MBX-AH001' }),
  demo({ id: '2', court: 'A', date: getDateStr(0), startTime: '19:00', endTime: '20:00', durationHours: 1, name: 'Usman Khan', phone: '+923009876543', email: 'usman@example.com', status: 'confirmed', totalPrice: 3250, ref: 'MBX-UK002' }),
  demo({ id: '3', court: 'A', date: getDateStr(0), startTime: '21:00', endTime: '22:30', durationHours: 1.5, name: 'Bilal Ahmed', phone: '+923331234567', email: 'bilal@example.com', status: 'pending', totalPrice: 4875, ref: 'MBX-BA003', holdExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() }),
  demo({ id: '4', court: 'B', date: getDateStr(0), startTime: '10:00', endTime: '11:00', durationHours: 1, name: 'Faisal Raza', phone: '+923215678901', email: 'faisal@example.com', status: 'confirmed', totalPrice: 1500, ref: 'MBX-FR004' }),
  demo({ id: '6', court: 'A', date: getDateStr(1), startTime: '07:00', endTime: '08:00', durationHours: 1, name: 'Hamza Sheikh', phone: '+923001112233', email: 'hamza@example.com', status: 'confirmed', totalPrice: 1500, ref: 'MBX-HS006' }),
]

let demoBookings: Booking[] = [...MOCK_BOOKINGS]

export function getDemoBookings(): Booking[] {
  return demoBookings
}

export function addDemoBooking(booking: Booking): void {
  demoBookings = [booking, ...demoBookings]
}

export function updateDemoBooking(id: string, updates: Partial<Booking>): Booking | null {
  const idx = demoBookings.findIndex(b => b.id === id)
  if (idx === -1) return null
  demoBookings[idx] = { ...demoBookings[idx], ...updates }
  return demoBookings[idx]
}

export function deleteDemoBooking(id: string): boolean {
  const before = demoBookings.length
  demoBookings = demoBookings.filter(b => b.id !== id)
  return demoBookings.length < before
}

export function expireHolds(): void {
  const now = new Date().toISOString()
  demoBookings = demoBookings.map(b =>
    b.status === 'pending' && b.holdExpiresAt && b.holdExpiresAt < now
      ? { ...b, status: 'cancelled', attendance: 'cancelled' }
      : b
  )
}
