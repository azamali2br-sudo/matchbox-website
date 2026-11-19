import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Account | Matchbox Padel Club',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
