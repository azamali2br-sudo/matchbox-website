import Link from 'next/link'

export const metadata = { title: 'Page not found | Matchbox Padel Club' }

// Branded 404 — the layout already wraps this with the Navbar and Footer.
export default function NotFound() {
  return (
    <div className="min-h-[70vh] bg-navy pt-28 flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-6 py-16 text-center">
        <p className="font-poppins text-orange text-xs font-semibold uppercase tracking-[0.2em] mb-4">Error 404</p>
        <h1 className="font-qaranta text-5xl sm:text-6xl text-white uppercase leading-none mb-4">
          Out of <span className="text-orange">bounds</span>
        </h1>
        <p className="font-poppins text-white/55 text-sm leading-relaxed mb-10">
          That page doesn&apos;t exist — the link may be old or mistyped. Let&apos;s get you back on court.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/booking" className="bg-orange hover:bg-orange-dark text-white font-poppins font-semibold text-sm px-6 py-3.5 rounded-xl transition-colors">
            Book a Court
          </Link>
          <Link href="/" className="border border-white/15 hover:border-orange/40 text-white font-poppins font-semibold text-sm px-6 py-3.5 rounded-xl transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
