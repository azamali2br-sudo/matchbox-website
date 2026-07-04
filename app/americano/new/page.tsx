import type { Metadata } from 'next'
import NewClient from './NewClient'

export const metadata: Metadata = {
  title: 'Create an Americano | Matchbox Padel Club',
  description: 'Free Americano and Mexicano tournament organizer. Set your players, get auto-generated rounds and live standings — no account needed.',
}

export default function NewAmericanoPage() {
  return <NewClient />
}
