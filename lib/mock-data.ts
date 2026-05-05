import { getDateStr } from './constants'

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled'

export interface Booking {
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
  createdAt: string
}

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: '1',
    court: 'A',
    date: getDateStr(0),
    startTime: '08:00',
    endTime: '10:00',
    durationHours: 2,
    name: 'Ali Hassan',
    phone: '+923001234567',
    email: 'ali@example.com',
    status: 'confirmed',
    totalPrice: 3000,
    ref: 'MBX-AH001',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    court: 'A',
    date: getDateStr(0),
    startTime: '19:00',
    endTime: '20:00',
    durationHours: 1,
    name: 'Usman Khan',
    phone: '+923009876543',
    email: 'usman@example.com',
    status: 'confirmed',
    totalPrice: 3250,
    ref: 'MBX-UK002',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    court: 'A',
    date: getDateStr(0),
    startTime: '21:00',
    endTime: '22:30',
    durationHours: 1.5,
    name: 'Bilal Ahmed',
    phone: '+923331234567',
    email: 'bilal@example.com',
    status: 'pending',
    totalPrice: 4875,
    ref: 'MBX-BA003',
    createdAt: new Date().toISOString(),
  },
  {
    id: '4',
    court: 'B',
    date: getDateStr(0),
    startTime: '10:00',
    endTime: '11:00',
    durationHours: 1,
    name: 'Faisal Raza',
    phone: '+923215678901',
    email: 'faisal@example.com',
    status: 'confirmed',
    totalPrice: 1500,
    ref: 'MBX-FR004',
    createdAt: new Date().toISOString(),
  },
  {
    id: '5',
    court: 'B',
    date: getDateStr(0),
    startTime: '18:00',
    endTime: '20:00',
    durationHours: 2,
    name: 'Zain Malik',
    phone: '+923451234567',
    email: 'zain@example.com',
    status: 'pending',
    totalPrice: 6500,
    ref: 'MBX-ZM005',
    createdAt: new Date().toISOString(),
  },
  {
    id: '6',
    court: 'A',
    date: getDateStr(1),
    startTime: '07:00',
    endTime: '08:00',
    durationHours: 1,
    name: 'Hamza Sheikh',
    phone: '+923001112233',
    email: 'hamza@example.com',
    status: 'confirmed',
    totalPrice: 1500,
    ref: 'MBX-HS006',
    createdAt: new Date().toISOString(),
  },
  {
    id: '7',
    court: 'B',
    date: getDateStr(1),
    startTime: '20:00',
    endTime: '22:00',
    durationHours: 2,
    name: 'Saad Qureshi',
    phone: '+923009994444',
    email: 'saad@example.com',
    status: 'confirmed',
    totalPrice: 6500,
    ref: 'MBX-SQ007',
    createdAt: new Date().toISOString(),
  },
]

// In-memory store for demo mode — new bookings accumulate here per server session
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
