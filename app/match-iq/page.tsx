import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Match IQ | Matchbox Padel Club",
  description: "Match IQ — Matchbox's Elo-based player rating system. Track your performance, climb the leaderboard.",
};

export default function MatchIQPage() {
  return (
    <section className="min-h-screen bg-navy flex items-center justify-center pt-20">
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <div className="w-20 h-20 rounded-2xl bg-orange/10 border border-orange/25 flex items-center justify-center mx-auto mb-8">
          <svg className="w-9 h-9 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>

        <div className="inline-flex items-center gap-2 bg-orange/10 border border-orange/25 rounded-full px-4 py-2 mb-8">
          <span className="w-2 h-2 rounded-full bg-orange animate-pulse" />
          <span className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest">Coming Soon</span>
        </div>

        <h1 className="font-qaranta text-5xl md:text-6xl text-white uppercase leading-tight mb-6">
          Match<br />
          <span className="text-orange">IQ</span>
        </h1>

        <p className="font-poppins text-white/60 text-base leading-relaxed mb-10 max-w-md mx-auto">
          Pakistan&apos;s first padel Elo rating system. Play matches, submit scores, and watch your
          rating move in real time. Everyone starts at 60 — where you end up is up to you.
        </p>

        <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-10">
          {[
            { value: "60", label: "Starting Rating" },
            { value: "2v2", label: "Format" },
            { value: "Elo", label: "Method" },
          ].map((stat) => (
            <div key={stat.label} className="bg-navy-card rounded-xl p-4 border border-white/8">
              <div className="font-qaranta text-2xl text-orange">{stat.value}</div>
              <div className="font-poppins text-white/40 text-xs mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://wa.me/923222172629"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-orange hover:bg-orange-dark text-white font-poppins font-semibold text-sm px-8 py-4 rounded-full transition-all duration-200 hover:shadow-xl hover:shadow-orange/30"
          >
            Get Notified on WhatsApp
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center border border-white/20 hover:border-white/40 text-white font-poppins font-semibold text-sm px-8 py-4 rounded-full transition-colors duration-200"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </section>
  );
}
