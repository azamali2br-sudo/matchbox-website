import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE, createSessionToken, sessionCookieOptions } from '@/lib/admin-auth'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, 'admin-login', 5, 15 * 60 * 1000)
  if (limited) return limited

  const { password } = await request.json()
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (password !== adminPassword) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const store = await cookies()
  store.set(ADMIN_COOKIE, createSessionToken(), sessionCookieOptions())
  return NextResponse.json({ success: true })
}

export async function DELETE() {
  const store = await cookies()
  store.delete(ADMIN_COOKIE)
  return NextResponse.json({ success: true })
}
