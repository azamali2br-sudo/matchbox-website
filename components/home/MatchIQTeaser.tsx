import Link from "next/link";

const mockPlayers = [
  { rank: 1, name: "Ali Hassan", rating: 84.2, trend: "up", matches: 42 },
  { rank: 2, name: "Usman Khan", rating: 81.7, trend: "up", matches: 38 },
  { rank: 3, name: "Bilal Ahmed", rating: 79.4, trend: "down", matches: 51 },
  { rank: 4, name: "Faisal Raza", rating: 76.1, trend: "up", matches: 29 },
  { rank: 5, name: "Zain Malik", rating: 73.8, trend: "down", matches: 33 },
];

export default function MatchIQTeaser() {
  return (
    <section className="bg-navy py-24 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left — Copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-orange/10 border border-orange/25 rounded-full px-4 py-2 mb-8">
              <span className="w-2 h-2 rounded-full bg-orange" />
              <span className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest">
                Coming Soon
              </span>
            </div>

            <h2 className="font-qaranta text-5xl md:text-6xl text-white uppercase leading-tight mb-6">
              Introducing<br />
              <span className="text-orange">Match IQ</span>
            </h2>

            <p className="font-poppins text-white/60 text-base leading-relaxed mb-6">
              Matchbox&apos;s proprietary player rating system — inspired by chess Elo, built for padel.
              Every match you play moves your rating. Every win against a stronger team earns you more.
            </p>

            <ul className="space-y-4 mb-10">
              {[
                "Everyone starts at 60 — earn your way up",
                "2v2 team-based Elo calculation",
                "Beat stronger opponents, gain bigger rewards",
                "Public leaderboard, player profiles, full match history",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-orange/15 border border-orange/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-orange" />
                  </div>
                  <span className="font-poppins text-white/70 text-sm leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/match-iq"
              className="inline-flex items-center gap-2 border border-orange/40 hover:border-orange hover:bg-orange/5 text-orange font-poppins font-semibold text-sm px-7 py-3.5 rounded-full transition-all duration-200"
            >
              Learn More About Match IQ
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>

          {/* Right — Mock Leaderboard */}
          <div className="relative">
            {/* Glow effect behind card */}
            <div className="absolute inset-0 bg-orange/5 rounded-3xl blur-3xl scale-110 pointer-events-none" />

            <div className="relative bg-navy-card rounded-3xl border border-white/8 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/8">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange/15 border border-orange/25 flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <span className="font-qaranta text-white text-lg uppercase">Leaderboard</span>
                </div>
                <span className="font-poppins text-white/30 text-xs">Preview</span>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-12 gap-2 px-6 py-3 border-b border-white/5">
                <span className="col-span-1 font-poppins text-white/30 text-xs">#</span>
                <span className="col-span-5 font-poppins text-white/30 text-xs">Player</span>
                <span className="col-span-3 font-poppins text-white/30 text-xs text-center">Matches</span>
                <span className="col-span-3 font-poppins text-white/30 text-xs text-right">Rating</span>
              </div>

              {/* Players */}
              {mockPlayers.map((player, i) => (
                <div
                  key={player.rank}
                  className={`grid grid-cols-12 gap-2 items-center px-6 py-4 ${
                    i < mockPlayers.length - 1 ? "border-b border-white/5" : ""
                  } ${i === 0 ? "bg-orange/5" : ""}`}
                >
                  <span
                    className={`col-span-1 font-qaranta text-lg ${
                      i === 0 ? "text-orange" : "text-white/30"
                    }`}
                  >
                    {player.rank}
                  </span>
                  <div className="col-span-5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-navy-dark border border-white/10 flex items-center justify-center flex-shrink-0">
                      <span className="font-qaranta text-xs text-white/60">
                        {player.name.charAt(0)}
                      </span>
                    </div>
                    <span className="font-poppins text-sm text-white font-medium truncate">
                      {player.name}
                    </span>
                  </div>
                  <span className="col-span-3 font-poppins text-xs text-white/40 text-center">
                    {player.matches}
                  </span>
                  <div className="col-span-3 flex items-center justify-end gap-1.5">
                    <svg
                      className={`w-3 h-3 flex-shrink-0 ${
                        player.trend === "up" ? "text-green-400" : "text-red-400"
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      {player.trend === "up" ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                      )}
                    </svg>
                    <span className="font-qaranta text-lg text-white">{player.rating}</span>
                  </div>
                </div>
              ))}

              {/* Footer note */}
              <div className="px-6 py-4 bg-white/2 border-t border-white/5 text-center">
                <span className="font-poppins text-white/25 text-xs">
                  Sample data — real ratings launch soon
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
