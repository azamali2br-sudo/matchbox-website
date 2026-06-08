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
  const { data, error } = await supabaseAdmin
    .from('accounts')
    .select('id, name')
    .ilike('name', `%${q}%`)
    .order('name', { ascending: true })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ players: data ?? [] })
}
