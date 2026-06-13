// Presentational match cards shared by the season recap (server component) and
// the player profile (client component). No hooks / no 'use client' so they
// render in either context.
import type { AwardMatch } from '@/lib/leaderboard'

function shortDate(iso: string) {
  // played_on is a plain date — format from its parts pinned to UTC so it never
  // shifts a day under a different runtime timezone.
  const [y, mo, d] = iso.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, d)).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

// Compact one-line row for multi-match award lists (Iron Man, Wildfire, …).
// Winners sit to the left of the score, losers to the right; the award player
// (highlightId) is brightened so they can spot themselves.
export function AwardMatchRow({ m, highlightId }: { m: AwardMatch; highlightId?: string }) {
  const side = (players: AwardMatch['winners']) =>
    players.map((p, i) => (
      <span key={p.id}>
        <span className={p.id === highlightId ? 'text-white font-semibold' : 'text-white/55'}>{p.name}</span>
        {i < players.length - 1 && <span className="text-white/25"> &amp; </span>}
      </span>
    ))
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2.5 py-2 border-t border-white/5 first:border-t-0">
      <span className="font-poppins text-[11px] truncate text-right">{side(m.winners)}</span>
      <span className="flex flex-col items-center leading-none">
        <span className="font-poppins text-xs font-semibold text-orange">{m.winnerScore}–{m.loserScore}</span>
        <span className="font-poppins text-[9px] text-white/25 mt-0.5">{shortDate(m.playedOn)}</span>
      </span>
      <span className="font-poppins text-[11px] truncate">{side(m.losers)}</span>
    </div>
  )
}

// Featured scorecard for the Giant Slayer upset — the drama is the rating gap,
// so it leads. Ratings sit in a right-aligned column (clean alignment); the
// score divides the two teams; the gap is the punchline.
function SlayerTeam({ label, tone, players, avg, muted }: {
  label: string; tone: string; players: AwardMatch['winners']; avg: number; muted?: boolean
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className={`font-poppins text-[10px] font-semibold uppercase tracking-wider ${tone}`}>{label}</span>
        <span className="font-poppins text-[10px] text-white/35">avg {avg}</span>
      </div>
      <div className="space-y-1">
        {players.map(p => (
          <div key={p.id} className="flex items-baseline justify-between gap-3">
            <span className={`font-poppins text-[13px] truncate ${muted ? 'text-white/55' : 'text-white font-medium'}`}>{p.name}</span>
            <span className={`font-qaranta text-sm tabular-nums shrink-0 ${muted ? 'text-white/40' : 'text-white/75'}`}>{p.rating}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SlayerScorecard({ m }: { m: AwardMatch }) {
  const gap = m.loserAvg - m.winnerAvg
  return (
    <div className="rounded-2xl border border-purple-400/20 bg-purple-400/[0.05] overflow-hidden">
      <div className="px-4 pt-3.5 pb-3">
        <SlayerTeam label="Slayers" tone="text-green-400" players={m.winners} avg={m.winnerAvg} />
        <div className="flex items-center gap-3 my-3">
          <span className="h-px flex-1 bg-white/10" />
          <span className="font-qaranta text-xl text-orange leading-none tabular-nums">{m.winnerScore}–{m.loserScore}</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <SlayerTeam label="Giants" tone="text-white/40" players={m.losers} avg={m.loserAvg} muted />
      </div>
      <div className="px-4 py-2 border-t border-purple-400/15 bg-purple-400/[0.05] flex items-center justify-between">
        <span className="font-poppins text-[11px] font-medium text-purple-200">{gap > 0 ? `A ${gap}-point upset` : 'Upset win'}</span>
        <span className="font-poppins text-[10px] text-white/35">{shortDate(m.playedOn)}</span>
      </div>
    </div>
  )
}
