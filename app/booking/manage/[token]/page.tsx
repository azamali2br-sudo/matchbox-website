import type { Metadata } from 'next'
import ManageClient from './ManageClient'

export const metadata: Metadata = {
  title: 'Manage Booking | Matchbox Padel Club',
  robots: { index: false, follow: false },
}

export default async function ManagePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  return <ManageClient token={token} />
}
