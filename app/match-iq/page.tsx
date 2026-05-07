import type { Metadata } from 'next'
import MatchIQClient from './MatchIQClient'

export const metadata: Metadata = {
  title: 'Match IQ | Matchbox Padel Club',
  description: "Pakistan's first padel Elo rating system. Play matches, submit scores, and watch your rating move in real time.",
}

export default function MatchIQPage() {
  return <MatchIQClient />
}
