import type { Metadata } from 'next'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Per-player title/description so a shared profile link previews as
// "Khwaja Waqas · Match IQ" in WhatsApp instead of a generic page title.
export async function generateMetadata({ params }: { params: Promise<{ playerId: string }> }): Promise<Metadata> {
  const { playerId } = await params
  const fallback: Metadata = { title: 'Player Profile | Match IQ | Matchbox Padel Club' }
  if (!UUID_RE.test(playerId)) return fallback
  try {
    const { supabase } = await import('@/lib/supabase')
    const { data } = await supabase.from('players').select('name').eq('id', playerId).maybeSingle()
    if (!data?.name) return fallback
    return {
      title: `${data.name} · Match IQ | Matchbox Padel Club`,
      description: `${data.name}'s Match IQ profile at Matchbox Padel Club — Skill Rating, match history and monthly badges.`,
    }
  } catch {
    return fallback
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
