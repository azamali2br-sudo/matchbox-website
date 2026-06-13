import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { monthLabel } from '@/lib/leaderboard'
import { loadMatchIqInputs, computeSeasonStandings, getClosedMonths, getSeasonSnapshot, type SeasonStandings } from '@/lib/seasons'
import { BADGE_DEFS, BADGE_TONE, type BadgeKey } from '@/lib/badges'

const MONTH_RE = /^\d{4}-\d{2}$/

async function getSeason(month: string): Promise<{ standings: SeasonStandings; closed: boolean } | null> {
  if (!MONTH_RE.test(month)) return null
  const closed = (await getClosedMonths()).has(month)
  const snap = closed ? await getSeasonSnapshot(month) : null
  if (snap) return { standings: snap, closed: true }
  const { nameById, allMatches } = await loadMatchIqInputs()
  const standings = computeSeasonStandings(month, nameById, allMatches)
  return { standings, closed }
}

export async function generateMetadata({ params }: { params: Promise<{ month: string }> }): Promise<Metadata> {
  const { month } = await params
  if (!MONTH_RE.test(month)) return { title: 'Season Recap | Match IQ' }
  const label = monthLabel(month)
  return {
    title: `${label} Season Recap | Matchbox Match IQ`,
    description: `Final Match IQ standings, champion and badges for ${label} at Matchbox Padel Club.`,
  }
}

export default async function SeasonRecapPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params
  const season = await getSeason(month)
  if (!season) notFound()

  const { standings, closed } = season
  const label = monthLabel(month)
  const { mainDraw } = standings
  const champion = mainDraw[0] ?? null

  // Achievement awards — the first Main Draw player holding each badge.
  const awardKeys: BadgeKey[] = ['ironman', 'perfect', 'streak', 'slayer', 'rookie']
  const awards = awardKeys
    .map(key => ({ key, player: mainDraw.find(p => p.badges.includes(key)) }))
    .filter((a): a is { key: BadgeKey; player: NonNullable<typeof a.player> } => !!a.player)

  return (
    <div className="min-h-screen bg-navy pt-28">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link href="/match-iq" className="font-poppins text-white/40 text-xs hover:text-white/70">← Back to Match IQ</Link>

        {/* Recap card — composed to look good as a single screenshot */}
        <div className="mt-5 bg-navy-card border border-white/10 rounded-3xl overflow-hidden">
          {/* Header band */}
          <div className="bg-gradient-to-br from-orange/20 to-transparent border-b border-white/10 px-6 sm:px-8 py-7 text-center">
            <p className="font-poppins text-orange text-xs font-semibold uppercase tracking-[0.2em]">Matchbox · Season Recap</p>
            <h1 className="font-qaranta text-4xl sm:text-5xl text-white uppercase leading-none mt-2">{label}</h1>
            <div className="mt-3 inline-flex items-center gap-2">
              {closed ? (
                <span className="font-poppins text-[10px] font-semibold uppercase tracking-wide text-green-400 border border-green-500/30 bg-green-500/10 rounded-full px-2.5 py-1">✓ Final standings</span>
              ) : (
                <span className="font-poppins text-[10px] font-semibold uppercase tracking-wide text-white/40 border border-white/15 rounded-full px-2.5 py-1">In progress · not yet final</span>
              )}
              <span className="font-poppins text-white/35 text-[11px]">{standings.totalMatches} matches · {standings.totalPlayers} players</span>
            </div>
          </div>

          {standings.totalMatches === 0 || !champion ? (
            <div className="px-8 py-16 text-center">
              <p className="font-poppins text-white/45 text-sm">No matches were played in {label}.</p>
            </div>
          ) : (
            <div className="px-6 sm:px-8 py-8">
              {/* Champion spotlight */}
              <div className="text-center">
                <div className="text-5xl">🏆</div>
                <p className="font-poppins text-yellow-300 text-xs font-semibold uppercase tracking-[0.2em] mt-2">Champion</p>
                <p className="font-qaranta text-3xl sm:text-4xl text-white mt-1 break-words">{champion.name}</p>
                <p className="font-poppins text-white/45 text-sm mt-1">
                  Rating {champion.rating} · {champion.wins}W–{champion.losses}L
                  {champion.winRate != null && ` · ${champion.winRate}% win`}
                </p>
              </div>

              {/* Podium 2–3 */}
              {mainDraw.length > 1 && (
                <div className="grid grid-cols-2 gap-3 mt-7">
                  {mainDraw.slice(1, 3).map((p, i) => (
                    <div key={p.id} className="bg-navy/50 border border-white/8 rounded-2xl px-4 py-4 text-center">
                      <div className="text-2xl">{i === 0 ? '🥈' : '🥉'}</div>
                      <p className="font-qaranta text-lg text-white mt-1 break-words">{p.name}</p>
                      <p className="font-poppins text-white/40 text-xs mt-0.5">Rating {p.rating} · {p.wins}W–{p.losses}L</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Achievement awards */}
              {awards.length > 0 && (
                <div className="mt-8 space-y-2">
                  <p className="font-poppins text-white/30 text-[11px] uppercase tracking-widest mb-3">Awards</p>
                  {awards.map(({ key, player }) => {
                    const def = BADGE_DEFS[key]
                    return (
                      <div key={key} className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 ${BADGE_TONE[def.tone]}`}>
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{def.icon}</span>
                          <span className="font-poppins text-xs font-semibold uppercase tracking-wide shrink-0">{def.label}</span>
                          <span className="font-poppins text-[11px] opacity-60 truncate hidden sm:inline">— {def.desc}</span>
                        </span>
                        <span className="font-poppins text-sm text-white font-semibold truncate">{player.name}</span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Full Main Draw */}
              <div className="mt-8">
                <p className="font-poppins text-white/30 text-[11px] uppercase tracking-widest mb-3">Final Main Draw</p>
                <div className="space-y-1">
                  {mainDraw.map(p => (
                    <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg odd:bg-white/[0.02]">
                      <span className="font-qaranta text-sm text-orange w-6 shrink-0">{p.rank}</span>
                      <span className="font-poppins text-sm text-white flex-1 min-w-0 break-words">{p.name}</span>
                      <span className="font-poppins text-white/40 text-xs shrink-0">{p.wins}W–{p.losses}L</span>
                      <span className="font-qaranta text-base text-white w-10 text-right shrink-0">{p.rating}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer band */}
          <div className="border-t border-white/10 px-8 py-4 text-center">
            <p className="font-poppins text-white/35 text-xs">matchboxpadel.com · Match IQ — Pakistan&apos;s first padel Elo</p>
          </div>
        </div>
      </div>
    </div>
  )
}
