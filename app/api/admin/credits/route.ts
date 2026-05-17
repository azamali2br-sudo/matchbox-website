import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { getCreditBalance, CREDIT_EXPIRY_DAYS } from '@/lib/credits'

const PHONE_RE = /^[+\d][\d\s()-]{6,19}$/

// GET ?phone=... — credit balance + ledger for one phone.
export async function GET(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (guard) return guard

  const { searchParams } = new URL(request.url)
  const phone = searchParams.get('phone')
  if (!phone || !PHONE_RE.test(phone)) {
    return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
  }

  const { supabaseAdmin } = await import('@/lib/supabase')
  const [balance, { data: ledger, error }] = await Promise.all([
    getCreditBalance(supabaseAdmin, phone),
    supabaseAdmin.from('credits').select('*').eq('phone', phone).order('created_at', { ascending: false }),
  ])
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ phone, balance, ledger: ledger ?? [] })
}

// POST — manual credit adjustment (goodwill, fix mistakes, no-show forgiveness).
// Body: { phone, amount (can be negative), note, expiresAt? }
export async function POST(request: NextRequest) {
  const guard = await requireAdmin(request)
  if (guard) return guard

  const body = await request.json()
  const phone = body.phone as string
  const amount = Number(body.amount)
  const note = body.note as string | undefined
  const customExpiry = body.expiresAt as string | undefined

  if (!phone || !PHONE_RE.test(phone)) return NextResponse.json({ error: 'Invalid phone' }, { status: 400 })
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1000000) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  }
  if (note && typeof note !== 'string') return NextResponse.json({ error: 'Invalid note' }, { status: 400 })

  // Positive adjustments get the standard 90-day expiry unless overridden.
  // Negative adjustments (e.g. clawback) don't expire.
  const expires_at = amount > 0
    ? (customExpiry ?? new Date(Date.now() + CREDIT_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString())
    : null

  const { supabaseAdmin } = await import('@/lib/supabase')
  const { data, error } = await supabaseAdmin.from('credits').insert({
    phone, amount, source: 'manual_adjust', note: note ?? null, expires_at,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const balance = await getCreditBalance(supabaseAdmin, phone)
  return NextResponse.json({ credit: data, balance })
}
