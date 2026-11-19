import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log in | Matchbox Padel Club',
  description: 'Log in to your Matchbox account with a one-tap email link — no password needed.',
  robots: { index: false, follow: true },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
