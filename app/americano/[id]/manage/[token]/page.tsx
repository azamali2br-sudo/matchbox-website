import type { Metadata } from 'next'
import ManageClient from './ManageClient'

export const metadata: Metadata = {
  title: 'Organizer | Americano | Matchbox Padel Club',
  description: 'Organizer controls for your Americano tournament.',
  robots: { index: false, follow: false },
}

export default async function AmericanoManagePage({ params, searchParams }: {
  params: Promise<{ id: string; token: string }>
  searchParams: Promise<{ cap?: string }>
}) {
  const { id, token } = await params
  // Optional ?cap=N stops the organizer from drawing past round N — a soft
  // planning guard for "we'll end at round N" nights.
  const capRaw = parseInt((await searchParams).cap ?? '', 10)
  const roundCap = Number.isInteger(capRaw) && capRaw > 0 ? capRaw : null
  return <ManageClient id={id} token={token} roundCap={roundCap} />
}
