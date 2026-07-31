'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const ERRORS: Record<string, string> = {
  expired: 'That login link expired or was already used. Enter your email to get a fresh one.',
  invalid: 'That link was invalid. Enter your email to get a new one.',
  server: 'Something went wrong. Please try again.',
}

function LoginInner() {
  const params = useSearchParams()
  const linkError = params.get('error')
  const nextPath = params.get('next')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/account/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, next: nextPath || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not send the link'); return }
      setSent(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="max-w-md mx-auto px-4 sm:px-6 py-12 text-center">
        <div className="w-20 h-20 rounded-full bg-orange/15 border border-orange/30 flex items-center justify-center mx-auto mb-6">
          <svg className="w-9 h-9 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
        </div>
        <h1 className="font-qaranta text-3xl text-white mb-3">Check your email</h1>
        <p className="font-poppins text-white/60 text-sm leading-relaxed">
          If <span className="text-white">{email}</span> has a Matchbox account, we&apos;ve sent a login link.
          It works once and expires in 30 minutes.
        </p>
        <p className="font-poppins text-white/40 text-xs mt-6">
          Don&apos;t have an account yet? <Link href="/signup" className="text-orange hover:text-orange-dark">Sign up</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 py-12">
      <h1 className="font-qaranta text-4xl text-white mb-2">Log in</h1>
      <p className="font-poppins text-white/55 text-sm mb-8">
        Enter your email and we&apos;ll send you a one-tap login link. No password needed.
      </p>

      {linkError && ERRORS[linkError] && (
        <div className="bg-orange/10 border border-orange/25 rounded-xl px-4 py-3 mb-5">
          <p className="font-poppins text-orange text-sm">{ERRORS[linkError]}</p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block font-poppins text-white/70 text-sm mb-2">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full bg-navy-card border border-white/10 text-white font-poppins text-sm px-4 py-3 rounded-xl outline-none focus:border-orange/50 transition-colors placeholder:text-white/20"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="font-poppins text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !email}
          className="w-full bg-orange hover:bg-orange-dark disabled:opacity-50 text-white font-poppins font-semibold text-sm py-4 rounded-full transition-all hover:shadow-xl hover:shadow-orange/30"
        >
          {submitting ? 'Sending…' : 'Send login link'}
        </button>
      </form>

      <p className="font-poppins text-white/40 text-xs text-center mt-6">
        New here? <Link href="/signup" className="text-orange hover:text-orange-dark">Create an account</Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-navy pt-28">
      <Suspense fallback={null}>
        <LoginInner />
      </Suspense>
    </div>
  )
}
