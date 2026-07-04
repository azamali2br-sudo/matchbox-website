import type { Metadata } from 'next'
import PublicClient from './PublicClient'

export const metadata: Metadata = {
  title: 'Americano Standings | Matchbox Padel Club',
  description: 'Live Americano tournament standings, powered by Matchbox Padel Club.',
}

export default async function AmericanoPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PublicClient id={id} />
}
