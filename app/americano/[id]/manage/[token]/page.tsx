import type { Metadata } from 'next'
import ManageClient from './ManageClient'

export const metadata: Metadata = {
  title: 'Organizer | Americano | Matchbox Padel Club',
  description: 'Organizer controls for your Americano tournament.',
  robots: { index: false, follow: false },
}

export default async function AmericanoManagePage({ params }: { params: Promise<{ id: string; token: string }> }) {
  const { id, token } = await params
  return <ManageClient id={id} token={token} />
}
