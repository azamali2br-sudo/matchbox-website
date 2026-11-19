// Shared slot rules for online bookings — used by POST /api/bookings (new
// booking) and POST /api/bookings/reschedule/[token] (customer moving their own
// booking), so both enforce exactly the same court / duration / closure /
// overlap rules.

import type { SupabaseClient } from '@supabase/supabase-js'

export const ALLOWED_COURTS = new Set(['A', 'B'])
export const ALLOWED_DURATIONS = new Set([1, 1.5, 2, 2.5, 3])
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TIME_RE = /^([01]\d|2[0-3]):(00|30)$/

export type SlotInput = { court: string; date: string; startTime: string; durationHours: number }

// Shape + basic validity. Returns an error message, or null when fine.
export function slotShapeError(s: Partial<SlotInput>): string | null {
  if (!s.court || !s.date || !s.startTime || !s.durationHours) return 'Missing required fields'
  if (!ALLOWED_COURTS.has(s.court)) return 'Invalid court'
  if (!DATE_RE.test(s.date)) return 'Invalid date'
  if (!TIME_RE.test(s.startTime)) return 'Invalid start time'
  if (!ALLOWED_DURATIONS.has(Number(s.durationHours))) return 'Invalid duration'
  return null
}

export function slotStartMs(date: string, startTime: string): number {
  return new Date(`${date}T${startTime}:00+05:00`).getTime()
}

// Online-only rules: not started yet, and not touching the 09:00–15:00 closure.
export function onlineSlotRuleError(s: SlotInput, nowMs = Date.now()): string | null {
  if (slotStartMs(s.date, s.startTime) <= nowMs) return 'This slot has already started'
  const [sh, sm] = s.startTime.split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin = startMin + Math.round(Number(s.durationHours) * 60)
  if (startMin < 15 * 60 && endMin > 9 * 60) return 'Matchbox is closed 9 AM – 3 PM'
  return null
}

// Does this slot overlap any non-cancelled booking on the same court? Checks the
// day before and after too, since late slots cross midnight. `excludeId` skips
// the booking being moved. Throws on a DB error.
export async function slotHasClash(db: SupabaseClient, s: SlotInput, excludeId?: string): Promise<boolean> {
  const shiftDate = (days: number) => { const d = new Date(`${s.date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10) }
  const prevDateStr = shiftDate(-1)
  const nextDateStr = shiftDate(1)

  let q = db
    .from('bookings')
    .select('id, date, start_time, duration_hours')
    .eq('court', s.court)
    .in('date', [prevDateStr, s.date, nextDateStr])
    .neq('attendance', 'cancelled')
  if (excludeId) q = q.neq('id', excludeId)
  const { data, error } = await q
  if (error) throw error

  const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }
  const newStart = toMin(s.startTime)
  const newEnd = newStart + Math.round(Number(s.durationHours) * 60)
  return (data ?? []).some(b => {
    const dayOffset = b.date === s.date ? 0 : b.date === prevDateStr ? -24 * 60 : 24 * 60
    const start = dayOffset + toMin(b.start_time as string)
    const end = start + Math.round(Number(b.duration_hours) * 60)
    return start < newEnd && end > newStart
  })
}
