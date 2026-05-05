export default function LeaguesTeaser() {
  return (
    <section className="bg-navy-dark py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="relative rounded-3xl bg-navy border border-white/8 overflow-hidden px-8 md:px-16 py-16 md:py-20">
          {/* Background decoration */}
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-orange/8 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-48 h-48 bg-orange/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left — Info */}
            <div>
              <div className="inline-flex items-center gap-2 bg-orange/10 border border-orange/25 rounded-full px-4 py-2 mb-8">
                <span className="w-2 h-2 rounded-full bg-orange animate-pulse" />
                <span className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest">
                  Coming Soon
                </span>
              </div>

              <h2 className="font-qaranta text-5xl md:text-6xl text-white uppercase leading-tight mb-6">
                Leagues &<br />
                <span className="text-orange">Tournaments</span>
              </h2>

              <p className="font-poppins text-white/60 text-base leading-relaxed mb-8">
                Matchbox is launching its first structured padel league — a 16-team competition with
                promotion and relegation just like European football.
                Top teams rise to Division 1. Bottom teams fight their way back up from Division 2.
              </p>

              <a
                href="https://wa.me/923222172629"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-orange hover:bg-orange-dark text-white font-poppins font-semibold text-sm px-7 py-3.5 rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-orange/25"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Register Your Interest
              </a>
            </div>

            {/* Right — League format visual */}
            <div className="space-y-4">
              {[
                {
                  division: "Division 1",
                  teams: "8 Teams",
                  desc: "Top 8 from the inaugural 16-team league",
                  accent: true,
                },
                {
                  division: "Division 2",
                  teams: "8 Teams",
                  desc: "Bottom 8 — fight your way back to the top",
                  accent: false,
                },
              ].map((div) => (
                <div
                  key={div.division}
                  className={`rounded-2xl p-6 border ${
                    div.accent
                      ? "bg-orange/8 border-orange/25"
                      : "bg-white/3 border-white/8"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-qaranta text-2xl uppercase ${div.accent ? "text-orange" : "text-white"}`}>
                      {div.division}
                    </span>
                    <span className="font-poppins text-xs font-semibold text-white/40 bg-white/5 px-3 py-1 rounded-full">
                      {div.teams}
                    </span>
                  </div>
                  <p className="font-poppins text-white/50 text-sm">{div.desc}</p>
                </div>
              ))}

              <div className="flex items-center gap-3 px-2">
                <div className="flex-1 h-px bg-white/10" />
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  <span className="font-poppins text-white/30 text-xs uppercase tracking-wide">Promotion & Relegation</span>
                </div>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              <div className="rounded-2xl p-5 border border-white/5 bg-white/2">
                <p className="font-poppins text-white/40 text-xs leading-relaxed text-center">
                  16-team inaugural league &bull; 2–3 month season &bull; Dates TBC
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
