import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone')

  if (phone) {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, phone, rating, wins, losses')
      .eq('phone', phone)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ player: data })
  }

  const { data, error } = await supabase
    .from('players')
    .select('id, name, phone, rating, wins, losses, created_at')
    .order('rating', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ players: data ?? [] })
}
