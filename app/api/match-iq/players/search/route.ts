import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'

// Name search over registered accounts for the match-submit picker.
// Returns id + name ONLY — never phone — so the member list can't be harvested
// (preserves the §20 security stance). The id returned is the account id;
// the match POST resolves it to a Match IQ player server-side.
export async function GET(request: NextRequest) {
  const limited = rateLimit(request, 'player-search', 120, 60 * 1000)
  if (limited) return limited

  const q = (new URL(request.url).searchParams.get('q') ?? '').trim()
  if (q.length < 1) return NextResponse.json({ players: [] })

  const { supabaseAdmin } = await import('@/lib/supabase')
  let query = supabaseAdmin
    .from('accounts')
    .select('id, name')
    .ilike('name', `%${q}%`)

  // Beta: any registered account can be picked (so pre-seeded regulars who
  // haven't claimed their profile yet still work). At public launch, flip
  // MATCH_IQ_VERIFIED_ONLY=true in Vercel so only accounts that have verified
  // via magic-link can be added as players — closes the fake-account vector.
  if (process.env.MATCH_IQ_VERIFIED_ONLY === 'true') {
    query = query.not('verified_at', 'is', null)
  }

  const { data, error } = await query.order('name', { ascending: true }).limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ players: data ?? [] })
}
