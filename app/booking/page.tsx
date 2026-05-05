import type { Metadata } from 'next'
import BookingClient from './BookingClient'

export const metadata: Metadata = {
  title: 'Book a Court | Matchbox Padel Club',
  description: 'Book Box A or Box B at Matchbox Padel Club, Malir Cantt. Available 24/7 — off-peak PKR 1,500/hr, peak PKR 3,250/hr.',
}

export default function BookingPage() {
  return <BookingClient />
}
