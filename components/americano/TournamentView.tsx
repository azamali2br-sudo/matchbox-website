'use client'

import { useState } from 'react'
import { FORMAT_LABEL, isActivePlayer, tournamentDate, type AmericanoPlayer, type AmericanoRound, type Standing } from '@/lib/americano'

// The publicProjection shape from /api/americano — one type for every surface.
export type TournamentState = {
  id: string
  name: string
  format: 'americano' | 'mexicano'
  pointsPerMatch: number
  courts: number
  playedOn: string
  status: 'active' | 'completed'
  players: AmericanoPlayer[]
  rounds: AmericanoRound[]
  isOfficial: boolean
  completedAt: string | null
  standings: Standing[]
}

export type OrganizerActions = {
  saveScore: (round: number, match: number, s1: number, s2: number) => Promise<string | null>
  nextRound: () => Promise<string | null>
  complete: () => Promise<string | null>
  busy: boolean
}

function nameFor(players: AmericanoPlayer[], id: number): string {
  return players.find(p => p.id === id)?.name ?? '—'
}

// ── Standings ────────────────────────────────────────────────────────────────
function StandingsTable({ t }: { t: TournamentState }) {
  const anyDraws = t.standings.some(s => s.draws > 0)
  return (
    <div className="space-y-2">
      <div className="hidden sm:grid grid-cols-[2.5rem_1fr_5rem_4rem_5rem] gap-3 px-5 pb-1">
        <div />
        <span className="font-poppins text-white/30 text-xs uppercase tracking-wider">Player</span>
        <span className="font-poppins text-white/30 text-xs uppercase tracking-wider text-right">Points</span>
        <span className="font-poppins text-white/30 text-xs uppercase tracking-wider text-center">Games</span>
        <span className="font-poppins text-white/30 text-xs uppercase tracking-wider text-center">{anyDraws ? 'W–D–L' : 'W–L'}</span>
      </div>
      {t.standings.map(s => {
        const rankColor = s.rank === 1 ? 'text-yellow-400' : s.rank === 2 ? 'text-slate-300' : s.rank === 3 ? 'text-amber-600' : 'text-white/30'
        const record = anyDraws ? `${s.wins}–${s.draws}–${s.losses}` : `${s.wins}–${s.losses}`
        const left = !s.active
        return (
          <div key={s.id} className={`bg-navy-card border border-white/8 rounded-2xl px-4 sm:px-5 py-3.5 sm:py-4 ${left ? 'opacity-50' : ''}`}>
            {/* Mobile */}
            <div className="sm:hidden flex items-center gap-3">
              <span className={`font-qaranta text-lg leading-none w-7 shrink-0 text-center ${rankColor}`}>{s.rank}</span>
              <div className="flex-1 min-w-0">
                <p className="font-poppins text-white text-sm font-semibold break-words leading-snug">{s.name}</p>
                <p className="font-poppins text-white/40 text-[11px] mt-0.5">
                  {s.games} {s.games === 1 ? 'game' : 'games'}
                  <span className="text-white/20 mx-1">·</span>
                  {record}
                  {left && <><span className="text-white/20 mx-1">·</span>left</>}
                </p>
              </div>
              <span className="font-qaranta text-2xl shrink-0 leading-none text-orange">{s.points}</span>
            </div>
            {/* Desktop */}
            <div className="hidden sm:grid grid-cols-[2.5rem_1fr_5rem_4rem_5rem] gap-3 items-center">
              <span className={`font-qaranta text-lg leading-none text-center ${rankColor}`}>{s.rank}</span>
              <p className="font-poppins text-white text-sm font-semibold truncate">
                {s.name}
                {left && <span className="font-poppins text-white/30 text-[11px] font-normal ml-2">left</span>}
              </p>
              <span className="font-qaranta text-xl text-right text-orange">{s.points}</span>
              <span className="font-poppins text-white/60 text-sm text-center font-medium">{s.games}</span>
              <span className="font-poppins text-white/45 text-xs text-center">{record}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── One match row (score display, or entry when organizer) ──────────────────
function MatchRow({
  t, roundIdx, matchIdx, organizer,
}: {
  t: TournamentState; roundIdx: number; matchIdx: number; organizer?: OrganizerActions
}) {
  const m = t.rounds[roundIdx].matches[matchIdx]
  const total = t.pointsPerMatch
  const [s1, setS1] = useState<string>(m.score1 === null ? '' : String(m.score1))
  const [s2, setS2] = useState<string>(m.score2 === null ? '' : String(m.score2))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const scored = m.score1 !== null && m.score2 !== null
  const editable = !!organizer && t.status === 'active'
  const dirty = editable && (s1 !== (m.score1 === null ? '' : String(m.score1)) || s2 !== (m.score2 === null ? '' : String(m.score2)))

  // Entering one side pre-fills the other (points always sum to the total).
  const onS1 = (v: string) => {
    setS1(v)
    const n = parseInt(v)
    if (!isNaN(n) && n >= 0 && n <= total) setS2(String(total - n))
  }

  const save = async () => {
    if (!organizer) return
    const n1 = parseInt(s1), n2 = parseInt(s2)
    if (isNaN(n1) || isNaN(n2)) { setErr('Enter both scores.'); return }
    setSaving(true); setErr(null)
    const e = await organizer.saveScore(roundIdx, matchIdx, n1, n2)
    setSaving(false)
    if (e) setErr(e)
  }

  const team1Won = scored && m.score1! > m.score2!
  const team2Won = scored && m.score2! > m.score1!
  const names = (team: [number, number]) => team.map(id => nameFor(t.players, id))

  return (
    <div className="border-t border-white/5 px-4 sm:px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 text-right min-w-0">
          {names(m.team1).map(n => (
            <p key={n} className={`font-poppins text-sm font-medium leading-snug break-words ${team1Won ? 'text-white' : scored ? 'text-white/40' : 'text-white/80'}`}>{n}</p>
          ))}
        </div>
        <div className="shrink-0 text-center w-24 sm:w-28">
          {editable ? (
            <div className="flex items-center justify-center gap-1.5">
              <input inputMode="numeric" value={s1} onChange={e => onS1(e.target.value)} placeholder="–"
                className="w-10 text-center font-qaranta text-xl text-white bg-navy border border-white/10 rounded-lg py-1.5 outline-none focus:border-orange/40" />
              <span className="font-poppins text-white/25">–</span>
              <input inputMode="numeric" value={s2} onChange={e => setS2(e.target.value)} placeholder="–"
                className="w-10 text-center font-qaranta text-xl text-white bg-navy border border-white/10 rounded-lg py-1.5 outline-none focus:border-orange/40" />
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span className={`font-qaranta text-2xl leading-none ${team1Won ? 'text-orange' : 'text-white/40'}`}>{m.score1 ?? '–'}</span>
              <span className="font-poppins text-white/15 text-base">–</span>
              <span className={`font-qaranta text-2xl leading-none ${team2Won ? 'text-orange' : 'text-white/40'}`}>{m.score2 ?? '–'}</span>
            </div>
          )}
          <p className="font-poppins text-white/25 text-[10px] uppercase tracking-wider mt-1.5">Court {m.court}</p>
        </div>
        <div className="flex-1 min-w-0">
          {names(m.team2).map(n => (
            <p key={n} className={`font-poppins text-sm font-medium leading-snug break-words ${team2Won ? 'text-white' : scored ? 'text-white/40' : 'text-white/80'}`}>{n}</p>
          ))}
        </div>
      </div>
      {editable && (dirty || err) && (
        <div className="flex items-center justify-center gap-3 mt-3">
          {err && <p className="font-poppins text-red-400 text-xs">{err}</p>}
          {dirty && (
            <button onClick={save} disabled={saving || organizer.busy}
              className="font-poppins text-xs font-semibold bg-orange hover:bg-orange-dark text-white rounded-full px-5 py-2 transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Save score'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Rounds (latest first) ────────────────────────────────────────────────────
function Rounds({ t, organizer }: { t: TournamentState; organizer?: OrganizerActions }) {
  return (
    <div className="space-y-4">
      {t.rounds.map((round, i) => ({ round, i })).reverse().map(({ round, i }) => (
        <div key={i} className="bg-navy-card border border-white/8 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-5 py-3">
            <span className="font-qaranta text-white/80 uppercase tracking-wide">Round {i + 1}</span>
            {round.sitOut.length > 0 && (
              <span className="font-poppins text-white/35 text-[11px] truncate ml-3">
                Sitting out: {round.sitOut.map(id => nameFor(t.players, id)).join(', ')}
              </span>
            )}
          </div>
          {round.matches.map((_, mIdx) => (
            <MatchRow key={`${i}-${mIdx}-${t.rounds[i].matches[mIdx].score1}-${t.rounds[i].matches[mIdx].score2}`}
              t={t} roundIdx={i} matchIdx={mIdx} organizer={organizer} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ── Full tournament view (public: no organizer prop; manage: with it) ───────
export default function TournamentView({ t, organizer }: { t: TournamentState; organizer?: OrganizerActions }) {
  const completed = t.status === 'completed'
  const champion = completed && t.standings.length > 0 ? t.standings[0] : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          <span className={`font-poppins text-[10px] font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 border ${
            completed ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-orange border-orange/30 bg-orange/10'
          }`}>
            {completed ? 'Final' : 'Live'}
          </span>
          {t.isOfficial && (
            <span className="font-poppins text-[10px] font-semibold uppercase tracking-wide rounded-full px-2.5 py-1 border text-white/60 border-white/15 bg-white/5">
              Official Matchbox Event
            </span>
          )}
        </div>
        <h1 className="font-qaranta text-4xl sm:text-5xl text-white uppercase leading-none break-words">{t.name}</h1>
        <p className="font-poppins text-white/45 text-sm mt-3">
          {tournamentDate(t.playedOn)}
          <span className="text-white/20 mx-1.5">·</span>{FORMAT_LABEL[t.format]}
          <span className="text-white/20 mx-1.5">·</span>{t.pointsPerMatch} points a match
          <span className="text-white/20 mx-1.5">·</span>{t.players.filter(isActivePlayer).length} players
        </p>
      </div>

      {/* Champion banner on completed tournaments */}
      {champion && (
        <div className="bg-gradient-to-r from-orange/15 to-transparent border border-orange/25 rounded-2xl px-5 py-4">
          <p className="font-poppins text-orange/80 text-[11px] font-semibold uppercase tracking-widest mb-1">Champion</p>
          <p className="font-qaranta text-3xl text-white uppercase leading-none">{champion.name}</p>
          <p className="font-poppins text-white/40 text-xs mt-1.5">{champion.points} points · {champion.wins}W {champion.losses}L</p>
        </div>
      )}

      {/* Standings */}
      <div>
        <h2 className="font-qaranta text-xl text-white/80 uppercase tracking-wide mb-3">Standings</h2>
        <StandingsTable t={t} />
      </div>

      {/* Rounds */}
      <div>
        <h2 className="font-qaranta text-xl text-white/80 uppercase tracking-wide mb-3">Rounds</h2>
        <Rounds t={t} organizer={organizer} />
      </div>
    </div>
  )
}
