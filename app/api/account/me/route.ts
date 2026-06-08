import { NextResponse } from 'next/server'
import { getCurrentAccountId } from '@/lib/account-auth'
import { getAccountById, getAccountDashboard } from '@/lib/accounts'

// The logged-in player's everything: profile, credit, Match IQ, booking history.
export async function GET() {
  const accountId = await getCurrentAccountId()
  if (!accountId) return NextResponse.json({ account: null }, { status: 401 })

  const { supabaseAdmin } = await import('@/lib/supabase')
  const account = await getAccountById(supabaseAdmin, accountId)
  if (!account) return NextResponse.json({ account: null }, { status: 401 })

  const dashboard = await getAccountDashboard(supabaseAdmin, account)
  return NextResponse.json(dashboard)
}
