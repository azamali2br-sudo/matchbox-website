import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Submit a Match | Match IQ | Matchbox Padel Club',
  description: 'Report a padel match result to Match IQ. Ratings update once an admin approves it.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
