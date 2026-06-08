import { NextResponse } from 'next/server'
import { ACCOUNT_COOKIE } from '@/lib/account-auth'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ACCOUNT_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
