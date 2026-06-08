'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/account/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Could not create your account'); return }
      setClaimed(!!data.claimed)
      setSent(true)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-navy pt-28">
        <div className="max-w-md mx-auto px-4 sm:px-6 py-12 text-center">
          <div className="w-20 h-20 rounded-full bg-orange/15 border border-orange/30 flex items-center justify-center mx-auto mb-6">
            <svg className="w-9 h-9 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <h1 className="font-qaranta text-3xl text-white mb-3">Almost there — check your email</h1>
          <p className="font-poppins text-white/60 text-sm leading-relaxed">
            We&apos;ve sent a verification link to <span className="text-white">{email}</span>.
            Tap it to {claimed ? 'unlock your profile' : 'finish setting up your account'} — it&apos;s ready and waiting.
          </p>
          {claimed && (
            <p className="font-poppins text-white/45 text-xs mt-5 leading-relaxed">
              Welcome back — your Match IQ rating and history are already linked to this number.
            </p>
          )}
          <p className="font-poppins text-white/40 text-xs mt-6">
            Link expires in 30 minutes. Already verified? <Link href="/login" className="text-orange hover:text-orange-dark">Log in</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-navy pt-28">
      <div className="max-w-md mx-auto px-4 sm:px-6 py-12">
        <h1 className="font-qaranta text-4xl text-white mb-2">Create your account</h1>
        <p className="font-poppins text-white/55 text-sm mb-8">
          One account for booking, credit, and your Match IQ stats. No password — we&apos;ll email you a link to log in.
        </p>

        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="block font-poppins text-white/70 text-sm mb-2">Full name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              className="w-full bg-navy-card border border-white/10 text-white font-poppins text-sm px-4 py-3 rounded-xl outline-none focus:border-orange/50 transition-colors placeholder:text-white/20"
            />
          </div>
          <div>
            <label className="block font-poppins text-white/70 text-sm mb-2">Mobile number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="0300 1234567"
              className="w-full bg-navy-card border border-white/10 text-white font-poppins text-sm px-4 py-3 rounded-xl outline-none focus:border-orange/50 transition-colors placeholder:text-white/20"
            />
            <p className="font-poppins text-white/35 text-xs mt-1.5">Your number is how your bookings, credit, and rating stay linked.</p>
          </div>
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
            <p className="font-poppins text-white/35 text-xs mt-1.5">We&apos;ll send your login link here.</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <p className="font-poppins text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !name || !phone || !email}
            className="w-full bg-orange hover:bg-orange-dark disabled:opacity-50 text-white font-poppins font-semibold text-sm py-4 rounded-full transition-all hover:shadow-xl hover:shadow-orange/30"
          >
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="font-poppins text-white/40 text-xs text-center mt-6">
          Already have an account? <Link href="/login" className="text-orange hover:text-orange-dark">Log in</Link>
        </p>
      </div>
    </div>
  )
}
