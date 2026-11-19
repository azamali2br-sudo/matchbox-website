import type { Metadata } from 'next'
import PublicClient from './PublicClient'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Tournament name in the title so a shared standings link previews as
// "Americano July 18 — Standings" rather than a generic title.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const fallback: Metadata = {
    title: 'Americano Standings | Matchbox Padel Club',
    description: 'Live Americano tournament standings, powered by Matchbox Padel Club.',
  }
  if (!UUID_RE.test(id)) return fallback
  try {
    const { supabaseAdmin } = await import('@/lib/supabase')
    const { data } = await supabaseAdmin
      .from('americano_tournaments')
      .select('name, is_hidden, players')
      .eq('id', id)
      .maybeSingle()
    if (!data || data.is_hidden) return { ...fallback, robots: { index: false } }
    const count = Array.isArray(data.players) ? data.players.length : null
    return {
      title: `${data.name} — Standings | Matchbox Padel Club`,
      description: `Live standings and rounds for ${data.name}${count ? ` (${count} players)` : ''}, run on Matchbox Padel Club's free Americano organizer.`,
    }
  } catch {
    return fallback
  }
}

export default async function AmericanoPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <PublicClient id={id} />
}
