// Canonical phone format for Matchbox = Pakistan E.164 (+923XXXXXXXXX).
// Mirrors the normalize_phone() SQL function in the accounts migration so the
// app and the database always agree on what "the same phone" means. Phone is
// the identity key for accounts/credits/bookings/Match IQ, so consistency here
// is load-bearing.

export function normalizePhone(raw: string): string {
  if (!raw) return ''
  const trimmed = raw.trim()
  const digits = trimmed.replace(/[^0-9]/g, '')

  // 0XXXXXXXXXX — local 11-digit (e.g. 03001234567) → drop the 0, add +92
  if (/^0\d{10}$/.test(digits)) return '+92' + digits.slice(1)
  // 92XXXXXXXXXX — country code without + → add +
  if (/^92\d{10}$/.test(digits)) return '+' + digits
  // 3XXXXXXXXX — 10 digits, missing leading 0 → add +92
  if (/^3\d{9}$/.test(digits)) return '+92' + digits
  // already +92XXXXXXXXXX
  if (/^\+92\d{10}$/.test(trimmed)) return trimmed
  // unknown shape: best-effort consistent form
  return '+' + digits
}

// A normalized PK mobile looks like +923XXXXXXXXX (13 chars).
export function isValidPkMobile(raw: string): boolean {
  return /^\+923\d{9}$/.test(normalizePhone(raw))
}

// Pretty display form: +92 300 1234567
export function formatPhoneDisplay(raw: string): string {
  const n = normalizePhone(raw)
  const m = n.match(/^\+92(\d{3})(\d{7})$/)
  return m ? `+92 ${m[1]} ${m[2]}` : n
}
