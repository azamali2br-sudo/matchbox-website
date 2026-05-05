import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Leagues & Tournaments | Matchbox Padel Club',
  description: 'Matchbox Padel Club leagues and tournaments. 16-team inaugural league — Division 1 and Division 2. Register on WhatsApp.',
}

const FORMAT_STEPS = [
  {
    step: '01',
    title: 'Registration',
    description: 'Message us on WhatsApp to register your team of 2. First 16 teams in are confirmed. Registration is free.',
  },
  {
    step: '02',
    title: 'Group Stage',
    description: 'All 16 teams compete in a round-robin group stage over 4–6 weeks. Every team plays at least 6 matches.',
  },
  {
    step: '03',
    title: 'Division Split',
    description: 'After the group stage, teams are ranked. Top 8 move to Division 1, bottom 8 to Division 2. Promotion and relegation each season.',
  },
  {
    step: '04',
    title: 'Playoffs',
    description: 'Top teams from each division compete in knockout playoffs. Division 1 champion claims the Matchbox title.',
  },
]

const DIVISIONS = [
  {
    name: 'Division 1',
    subtitle: 'Top 8 Teams',
    description: 'The elite tier. Teams ranked 1–8 after the group stage compete here. Win the Division 1 championship to be crowned Matchbox Champion.',
    accent: 'border-orange/40 bg-orange/5',
    badge: 'bg-orange text-white',
    icon: '🥇',
  },
  {
    name: 'Division 2',
    subtitle: 'Bottom 8 Teams',
    description: 'Teams ranked 9–16 compete here. Finish top of Division 2 to earn promotion to Division 1 next season.',
    accent: 'border-white/15 bg-white/3',
    badge: 'bg-white/10 text-white border border-white/15',
    icon: '🎯',
  },
]

const FAQS = [
  {
    q: 'How many players per team?',
    a: '2 players per team. You register as a pair — the same two players represent your team throughout the season.',
  },
  {
    q: 'What is the season length?',
    a: 'Approximately 2–3 months. Group stage runs 4–6 weeks, followed by playoffs over 2–3 weeks.',
  },
  {
    q: 'Is there a registration fee?',
    a: 'Registration is free for the inaugural season. Court booking fees apply for matches played.',
  },
  {
    q: 'What are the match timings?',
    a: 'Teams coordinate between themselves and book via our standard booking system. Fixtures are announced with a window to complete each round.',
  },
  {
    q: 'How does promotion and relegation work?',
    a: 'Each season, the bottom 2 teams from Division 1 are relegated to Division 2, and the top 2 from Division 2 are promoted — exactly like European football leagues.',
  },
  {
    q: 'What format is each match?',
    a: 'Best of 3 sets. Standard padel scoring. Match results are submitted through the Matchbox website once the Match IQ system launches.',
  },
]

export default function LeaguesPage() {
  return (
    <div className="min-h-screen bg-navy">
      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -right-24 -top-24 w-96 h-96 bg-orange/8 rotate-45" style={{ borderRadius: '40px' }} />
          <div
            className="absolute inset-0 opacity-15"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 bg-orange/10 border border-orange/25 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 rounded-full bg-orange animate-pulse" />
            <span className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest">
              Inaugural Season — Coming Soon
            </span>
          </div>
          <h1 className="font-qaranta text-6xl md:text-8xl text-white uppercase leading-none mb-6">
            Leagues &<br />
            <span className="text-orange">Tournaments</span>
          </h1>
          <p className="font-poppins text-white/60 text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
            Matchbox&apos;s 16-team league is coming. Promotion, relegation, and a title on the line.
            Pakistan&apos;s first club-level padel league format.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="https://wa.me/923222172629?text=Hi! I want to register for the Matchbox Padel League. Team name and player details:"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-orange hover:bg-orange-dark text-white font-poppins font-semibold text-sm px-8 py-4 rounded-full transition-all duration-200 hover:shadow-xl hover:shadow-orange/30"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Register Your Team
            </a>
            <Link
              href="#format"
              className="inline-flex items-center justify-center border border-white/20 hover:border-orange/40 text-white font-poppins font-semibold text-sm px-8 py-4 rounded-full transition-colors"
            >
              How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div className="bg-navy-dark border-y border-white/6">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-wrap gap-x-16 gap-y-6">
            {[
              { value: '16', label: 'Teams' },
              { value: '2', label: 'Divisions' },
              { value: '2–3', label: 'Month Season' },
              { value: '6+', label: 'Matches Per Team' },
              { value: 'Best of 3', label: 'Match Format' },
              { value: 'Free', label: 'Registration' },
            ].map(({ value, label }) => (
              <div key={label}>
                <p className="font-qaranta text-3xl text-orange">{value}</p>
                <p className="font-poppins text-white/40 text-xs uppercase tracking-wide mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Divisions */}
      <section className="py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-14">
            <p className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest mb-4">Structure</p>
            <h2 className="font-qaranta text-5xl md:text-6xl text-white uppercase leading-tight">
              Two Divisions.<br />One Trophy.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {DIVISIONS.map(div => (
              <div key={div.name} className={`rounded-3xl border p-8 md:p-10 ${div.accent}`}>
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <span className={`font-poppins text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full ${div.badge}`}>
                      {div.subtitle}
                    </span>
                    <h3 className="font-qaranta text-4xl text-white uppercase mt-4">{div.name}</h3>
                  </div>
                  <span className="text-4xl">{div.icon}</span>
                </div>
                <p className="font-poppins text-white/60 text-sm leading-relaxed">{div.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-navy-card rounded-2xl border border-white/8 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange/10 border border-orange/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </div>
            <p className="font-poppins text-white/60 text-sm">
              <span className="text-white font-medium">Promotion & Relegation:</span> Top 2 from Division 2 go up. Bottom 2 from Division 1 come down. Every season matters.
            </p>
          </div>
        </div>
      </section>

      {/* Format steps */}
      <section id="format" className="bg-navy-dark py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-14">
            <p className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest mb-4">How It Works</p>
            <h2 className="font-qaranta text-5xl md:text-6xl text-white uppercase leading-tight">
              The Format
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FORMAT_STEPS.map((step, i) => (
              <div key={step.step} className="bg-navy rounded-2xl border border-white/8 p-8 relative overflow-hidden group hover:border-orange/25 transition-colors">
                <div className="absolute -right-3 -bottom-6 font-qaranta text-[100px] leading-none text-white/3 select-none pointer-events-none">
                  {step.step}
                </div>
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl bg-orange/10 border border-orange/20 flex items-center justify-center mb-5">
                    <span className="font-qaranta text-orange text-sm">{String(i + 1).padStart(2, '0')}</span>
                  </div>
                  <h3 className="font-qaranta text-2xl text-white uppercase mb-3 group-hover:text-orange transition-colors">{step.title}</h3>
                  <p className="font-poppins text-white/55 text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 md:py-32">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest mb-4">FAQ</p>
            <h2 className="font-qaranta text-5xl md:text-6xl text-white uppercase leading-tight">
              Common<br />Questions
            </h2>
          </div>
          <div className="space-y-3">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="bg-navy-card rounded-2xl border border-white/8 p-6 hover:border-orange/20 transition-colors">
                <h4 className="font-poppins text-white font-semibold text-sm mb-2">{q}</h4>
                <p className="font-poppins text-white/50 text-sm leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-navy-dark py-24">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="font-qaranta text-5xl md:text-6xl text-white uppercase leading-tight mb-6">
            Ready to<br />
            <span className="text-orange">Compete?</span>
          </h2>
          <p className="font-poppins text-white/55 text-base leading-relaxed mb-10">
            Message us on WhatsApp to secure your team&apos;s spot. First 16 teams in are confirmed. Don&apos;t miss the inaugural season.
          </p>
          <a
            href="https://wa.me/923222172629?text=Hi! I want to register for the Matchbox Padel League. Team name and player details:"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-orange hover:bg-orange-dark text-white font-poppins font-semibold px-10 py-4 rounded-full transition-all duration-200 hover:shadow-xl hover:shadow-orange/30"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Register on WhatsApp
          </a>
          <p className="font-poppins text-white/25 text-xs mt-6">
            Spots fill up fast — 16 teams max per season
          </p>
        </div>
      </section>
    </div>
  )
}
