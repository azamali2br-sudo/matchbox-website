import type { MetadataRoute } from 'next'
import { loadMatchIqInputs } from '@/lib/seasons'
import { monthsWithMatches } from '@/lib/leaderboard'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.matchboxpadel.com').trim().replace(/\/+$/, '')

// Rebuilt at most once a day — new players/months show up within 24h.
export const revalidate = 86400

// Public pages only. Private routes (admin, account, booking/manage, Americano
// organizer links) are excluded here and disallowed in robots.ts.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/booking`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/match-iq`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE_URL}/leagues`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/americano/new`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/signup`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: 'yearly', priority: 0.2 },
  ]

  // Match IQ season recaps + player profiles (players with at least one approved match).
  try {
    const { allMatches } = await loadMatchIqInputs()
    for (const ym of monthsWithMatches(allMatches)) {
      pages.push({ url: `${SITE_URL}/match-iq/season/${ym}`, changeFrequency: 'weekly', priority: 0.5 })
    }
    const lastPlayed = new Map<string, string>()
    for (const m of allMatches) {
      for (const id of [m.team1_p1, m.team1_p2, m.team2_p1, m.team2_p2]) {
        if (id && (lastPlayed.get(id) ?? '') < m.played_on) lastPlayed.set(id, m.played_on)
      }
    }
    for (const [id, playedOn] of lastPlayed) {
      pages.push({ url: `${SITE_URL}/match-iq/${id}`, lastModified: new Date(`${playedOn}T12:00:00Z`), changeFrequency: 'weekly', priority: 0.4 })
    }
  } catch (err) {
    console.error('[sitemap] Match IQ entries skipped:', err)
  }

  // Official (curated, visible) Americano tournaments.
  try {
    const { supabaseAdmin } = await import('@/lib/supabase')
    const { data } = await supabaseAdmin
      .from('americano_tournaments')
      .select('id, played_on')
      .eq('is_official', true)
      .eq('is_hidden', false)
    for (const t of data ?? []) {
      pages.push({ url: `${SITE_URL}/americano/${t.id}`, lastModified: new Date(`${t.played_on}T12:00:00Z`), changeFrequency: 'monthly', priority: 0.4 })
    }
  } catch (err) {
    console.error('[sitemap] Americano entries skipped:', err)
  }

  return pages
}
