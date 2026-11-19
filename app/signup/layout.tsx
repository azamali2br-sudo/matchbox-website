import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create your account | Matchbox Padel Club',
  description: 'One Matchbox account for court bookings, credit and your Match IQ rating. No password — we email you a link.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
