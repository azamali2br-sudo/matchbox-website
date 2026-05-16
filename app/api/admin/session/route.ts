import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE, verifySessionToken } from '@/lib/admin-auth'

export async function GET() {
  const store = await cookies()
  const token = store.get(ADMIN_COOKIE)?.value
  return NextResponse.json({ authed: verifySessionToken(token) })
}
