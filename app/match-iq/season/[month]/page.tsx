import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  monthLabel, replaySeason, awardMatchIds, enrichMatches,
  type AwardMatch, type MatchRow,
} from '@/lib/leaderboard'
import { loadMatchIqInputs, computeSeasonStandings, getClosedMonths, getSeasonSnapshot, type SeasonStandings } from '@/lib/seasons'
import { BADGE_DEFS, BADGE_TONE, type BadgeKey } from '@/lib/badges'

const MONTH_RE = /^\d{4}-\d{2}$/

async function getSeason(month: string): Promise<
  { standings: SeasonStandings; closed: boolean; nameById: Record<string, string>; monthMatches: MatchRow[] } | null
> {
  if (!MONTH_RE.test(month)) return null
  const { nameById, allMatches } = await loadMatchIqInputs()
  const monthMatches = allMatches.filter(m => m.played_on.slice(0, 7) === month)
  const closed = (await getClosedMonths()).has(month)
  const snap = closed ? await getSeasonSnapshot(month) : null
  const standings = snap ?? computeSeasonStandings(month, nameById, allMatches)
  return { standings, closed, nameById, monthMatches }
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

// One supporting match — who teamed up, who they beat, at what ratings.
function AwardMatchCard({ m, isUpset }: { m: AwardMatch; isUpset?: boolean }) {
  const date = new Date(m.playedOn).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })
  const gap = m.loserAvg - m.winnerAvg
  return (
    <div className="bg-navy/50 rounded-lg px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="font-poppins text-[10px] text-white/40 uppercase tracking-wider">{date}</span>
        {isUpset && gap > 0 && (
          <span className="font-poppins text-[10px] text-purple-300 font-semibold">Upset · beat a team {gap} higher</span>
        )}
      </div>
      <div className="flex items-center gap-2.5">
        <div className="flex-1 min-w-0">
          <p className="font-poppins text-xs text-white font-semibold break-words">{m.winners.map(w => `${w.name} (${w.rating})`).join(' & ')}</p>
          <p className="font-poppins text-[10px] text-green-400/80">won · team avg {m.winnerAvg}</p>
        </div>
        <span className="font-qaranta text-base text-orange shrink-0">{m.winnerScore}–{m.loserScore}</span>
        <div className="flex-1 min-w-0 text-right">
          <p className="font-poppins text-xs text-white/55 font-medium break-words">{m.losers.map(l => `${l.name} (${l.rating})`).join(' & ')}</p>
          <p className="font-poppins text-[10px] text-white/35">team avg {m.loserAvg}</p>
        </div>
      </div>
    </div>
  )
}

export default async function SeasonRecapPage({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params
  const season = await getSeason(month)
  if (!season) notFound()

  const { standings, closed, nameById, monthMatches } = season
  const label = monthLabel(month)
  const { mainDraw } = standings
  const champion = mainDraw[0] ?? null

  // Award winners (Giant Slayer is a pair) + their supporting matches.
  const allPlayers = [...standings.mainDraw, ...standings.qualifying]
  const { log, upsetMatchByPlayer } = replaySeason(monthMatches)
  const awardKeys: BadgeKey[] = ['ironman', 'perfect', 'streak', 'slayer', 'rookie']
  const awards = awardKeys
    .map(key => {
      const winners = allPlayers.filter(p => p.badges.includes(key))
      if (!winners.length) return null
      const detail = enrichMatches(awardMatchIds(key, winners[0].id, monthMatches, upsetMatchByPlayer), log, nameById)
      return { key, winners, detail }
    })
    .filter((a): a is NonNullable<typeof a> => a !== null)

  return (
    <div className="min-h-screen bg-navy pt-28">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Link href="/match-iq" className="font-poppins text-white/40 text-xs hover:text-white/70">← Back to Match IQ</Link>

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
                <p className="font-poppins text-yellow-300 text-xs font-semibold uppercase tracking-[0.28em]">Champion</p>
                <p className="font-qaranta text-4xl sm:text-5xl text-white mt-2 break-words leading-none">{champion.name}</p>
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
                      <p className={`font-poppins text-[10px] font-semibold uppercase tracking-widest ${i === 0 ? 'text-slate-300' : 'text-amber-500'}`}>{i === 0 ? 'Runner-up' : 'Third Place'}</p>
                      <p className="font-qaranta text-lg text-white mt-1.5 break-words">{p.name}</p>
                      <p className="font-poppins text-white/40 text-xs mt-0.5">Rating {p.rating} · {p.wins}W–{p.losses}L</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Achievement awards — click a title to see the matches behind it */}
              {awards.length > 0 && (
                <div className="mt-8 space-y-2">
                  <p className="font-poppins text-white/30 text-[11px] uppercase tracking-widest mb-3">Awards · tap to see the matches</p>
                  {awards.map(({ key, winners, detail }) => {
                    const def = BADGE_DEFS[key]
                    const title = key === 'streak' ? `${def.label} (${winners[0].maxStreak})` : def.label
                    return (
                      <details key={key} className={`group rounded-xl border ${BADGE_TONE[def.tone]}`}>
                        <summary className="flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                          <span className="flex items-baseline gap-2 min-w-0">
                            <span className="font-poppins text-xs font-semibold uppercase tracking-wide shrink-0">{title}</span>
                            <span className="font-poppins text-[11px] opacity-60 truncate hidden sm:inline">— {def.desc}</span>
                          </span>
                          <span className="flex items-center gap-2 shrink-0">
                            <span className="font-poppins text-sm text-white font-semibold truncate max-w-[10rem]">{winners.map(w => w.name).join(' & ')}</span>
                            <span className="text-[9px] text-white/40 group-open:rotate-180 transition-transform">▼</span>
                          </span>
                        </summary>
                        <div className="px-3 pb-3 pt-1 space-y-1.5 border-t border-white/10">
                          {detail.length > 0 ? detail.map(m => (
                            <AwardMatchCard key={m.id} m={m} isUpset={key === 'slayer'} />
                          )) : (
                            <p className="font-poppins text-[11px] text-white/40 py-2 px-1">Match details unavailable.</p>
                          )}
                        </div>
                      </details>
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
