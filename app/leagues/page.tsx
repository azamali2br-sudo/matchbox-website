import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Leagues & Tournaments | Matchbox Padel Club",
  description: "Matchbox Padel Club leagues and tournaments — coming soon. 16-team league with promotion and relegation.",
};

export default function LeaguesPage() {
  return (
    <section className="min-h-screen bg-navy flex items-center justify-center pt-20">
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <div className="w-20 h-20 rounded-2xl bg-orange/10 border border-orange/25 flex items-center justify-center mx-auto mb-8">
          <svg className="w-9 h-9 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
        </div>

        <div className="inline-flex items-center gap-2 bg-orange/10 border border-orange/25 rounded-full px-4 py-2 mb-8">
          <span className="w-2 h-2 rounded-full bg-orange animate-pulse" />
          <span className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest">Coming Soon</span>
        </div>

        <h1 className="font-qaranta text-5xl md:text-6xl text-white uppercase leading-tight mb-6">
          Leagues &<br />
          <span className="text-orange">Tournaments</span>
        </h1>

        <p className="font-poppins text-white/60 text-base leading-relaxed mb-10 max-w-md mx-auto">
          Matchbox&apos;s 16-team league is coming. Promotion, relegation, and bragging rights on the line.
          Register your interest on WhatsApp to be first in line.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-sm mx-auto mb-10">
          <div className="bg-navy-card rounded-2xl p-5 border border-orange/20">
            <div className="font-qaranta text-2xl text-orange mb-1">Division 1</div>
            <div className="font-poppins text-white/50 text-xs">Top 8 teams</div>
          </div>
          <div className="bg-navy-card rounded-2xl p-5 border border-white/8">
            <div className="font-qaranta text-2xl text-white mb-1">Division 2</div>
            <div className="font-poppins text-white/50 text-xs">Bottom 8 teams</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://wa.me/923222172629"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-orange hover:bg-orange-dark text-white font-poppins font-semibold text-sm px-8 py-4 rounded-full transition-all duration-200 hover:shadow-xl hover:shadow-orange/30"
          >
            Register Interest on WhatsApp
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
