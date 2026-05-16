import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone')

  if (phone) {
    // Lookup-by-phone is used during match submission to find an existing
    // player. Return only id+name (never echo phone, rating, or W/L) so this
    // endpoint can't be enumerated to harvest profiles.
    const { data, error } = await supabase
      .from('players')
      .select('id, name')
      .eq('phone', phone)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ player: data })
  }

  // Public leaderboard — no phone
  const { data, error } = await supabase
    .from('players')
    .select('id, name, rating, wins, losses, created_at')
    .order('rating', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ players: data ?? [] })
}
