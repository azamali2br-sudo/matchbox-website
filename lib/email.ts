import { Resend } from 'resend'
import { BANK_DETAILS, WHATSAPP_NUMBER, formatCurrency, formatDate, formatTime } from './constants'

type BookingForEmail = {
  ref: string
  court: 'A' | 'B'
  date: string
  startTime: string
  endTime: string
  durationHours: number
  name: string
  email: string
  totalPrice: number
  holdExpiresAt?: string
}

const NAVY = '#181F49'
const ORANGE = '#F68E3B'
const GREEN = '#10B981'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://matchbox-website.vercel.app'
const MAPS_LINK = 'https://maps.app.goo.gl/fv8JrRiBJFiSrWJh7'

function courtLabel(c: 'A' | 'B'): string {
  return c === 'A' ? 'Box A' : 'Box B'
}

function bookingDetailsTable(b: BookingForEmail, includePrice = true): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;margin:0 0 20px">
    <tr><td style="padding:14px 16px;border-bottom:1px solid #e5e7eb"><div style="font-size:12px;color:#6b7280">Booking ref</div><div style="font-size:15px;font-weight:600">${b.ref}</div></td></tr>
    <tr><td style="padding:14px 16px;border-bottom:1px solid #e5e7eb"><div style="font-size:12px;color:#6b7280">Court</div><div style="font-size:15px;font-weight:600">${courtLabel(b.court)}</div></td></tr>
    <tr><td style="padding:14px 16px;border-bottom:1px solid #e5e7eb"><div style="font-size:12px;color:#6b7280">Date</div><div style="font-size:15px;font-weight:600">${formatDate(b.date)}</div></td></tr>
    <tr><td style="padding:14px 16px${includePrice ? ';border-bottom:1px solid #e5e7eb' : ''}"><div style="font-size:12px;color:#6b7280">Time</div><div style="font-size:15px;font-weight:600">${formatTime(b.startTime)} – ${formatTime(b.endTime)} (${b.durationHours}h)</div></td></tr>
    ${includePrice ? `<tr><td style="padding:14px 16px"><div style="font-size:12px;color:#6b7280">Amount</div><div style="font-size:18px;font-weight:700;color:${ORANGE}">${formatCurrency(b.totalPrice)}</div></td></tr>` : ''}
  </table>`
}

function shell(headerColor: string, accentLabel: string, bodyHtml: string): string {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:24px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:560px">
        <tr><td style="background:${NAVY};padding:28px 32px">
          <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:.5px">MATCHBOX</div>
          <div style="color:${headerColor};font-size:13px;margin-top:4px">${accentLabel}</div>
        </td></tr>
        <tr><td style="padding:28px 32px">${bodyHtml}</td></tr>
        <tr><td style="background:${NAVY};padding:18px 32px;text-align:center">
          <div style="color:#94a3b8;font-size:12px">Matchbox Padel Club · Malir Cantt, Karachi</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function renderPendingHtml(b: BookingForEmail): string {
  const expiryLine = b.holdExpiresAt
    ? new Date(b.holdExpiresAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })
    : '30 minutes from now'
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi! Payment screenshot for booking ${b.ref} (${courtLabel(b.court)}, ${formatDate(b.date)}, ${formatTime(b.startTime)}–${formatTime(b.endTime)})`,
  )}`
  const body = `<p style="margin:0 0 16px;font-size:15px;line-height:1.5">Hey ${b.name},</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5">Your slot is reserved. To confirm, please complete payment within <strong>30 minutes</strong> (by <strong>${expiryLine}</strong>) and send the screenshot on WhatsApp.</p>
    ${bookingDetailsTable(b)}
    <div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin:0 0 8px">Bank transfer</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin:0 0 20px">
      <tr><td style="padding:14px 16px">
        <div style="font-size:14px;line-height:1.7">
          <strong>${BANK_DETAILS.bankName}</strong><br>
          Title: ${BANK_DETAILS.accountTitle}<br>
          IBAN: <span style="font-family:monospace">${BANK_DETAILS.iban}</span>
        </div>
      </td></tr>
    </table>
    <div style="text-align:center;margin:24px 0 8px">
      <a href="${waLink}" style="display:inline-block;background:${ORANGE};color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px">Send screenshot on WhatsApp</a>
    </div>
    <p style="margin:8px 0 0;font-size:12px;color:#6b7280;text-align:center">Or message us at +${WHATSAPP_NUMBER}</p>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.5">If payment isn't received within 30 minutes, the slot will be released automatically. No charge.</p>`
  return shell(ORANGE, 'Booking pending — payment required', body)
}

function renderConfirmedHtml(b: BookingForEmail): string {
  const body = `<p style="margin:0 0 16px;font-size:15px;line-height:1.5">Hey ${b.name},</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5"><strong style="color:${GREEN}">Payment received ✓</strong> Your slot is locked in. See you on the court!</p>
    ${bookingDetailsTable(b, false)}
    <div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin:0 0 8px">Location</div>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:8px;margin:0 0 20px">
      <tr><td style="padding:14px 16px">
        <div style="font-size:14px;line-height:1.7">
          <strong>Matchbox Padel Club</strong><br>
          Malir Cantt, Karachi<br>
          <a href="${MAPS_LINK}" style="color:${ORANGE};text-decoration:none">Open in Google Maps →</a>
        </div>
      </td></tr>
    </table>
    <div style="font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin:0 0 8px">Good to know</div>
    <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;line-height:1.7;color:#374151">
      <li>Rackets, grips, and balls are included — no need to bring your own</li>
      <li>Arrive 5–10 min before your slot</li>
      <li>Questions? WhatsApp us at +${WHATSAPP_NUMBER}</li>
    </ul>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.5">Show this email at the gate if anyone asks. Have fun!</p>`
  return shell(GREEN, 'Booking confirmed', body)
}

function renderExpiredHtml(b: BookingForEmail): string {
  const bookAgainLink = `${SITE_URL}/booking`
  const body = `<p style="margin:0 0 16px;font-size:15px;line-height:1.5">Hey ${b.name},</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5">Your 30-minute payment window expired, so the slot below has been released. No charge was made.</p>
    ${bookingDetailsTable(b, false)}
    <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#6b7280">If you still want to play, you can book again — slots open up fast.</p>
    <div style="text-align:center;margin:24px 0 8px">
      <a href="${bookAgainLink}" style="display:inline-block;background:${ORANGE};color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600;font-size:15px">Book a slot</a>
    </div>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.5">Questions? WhatsApp us at +${WHATSAPP_NUMBER}.</p>`
  return shell('#9ca3af', 'Booking hold expired', body)
}

async function send(b: BookingForEmail, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping email')
    return
  }
  const resend = new Resend(apiKey)
  const from = process.env.EMAIL_FROM || 'Matchbox <onboarding@resend.dev>'
  const replyTo = process.env.EMAIL_REPLY_TO || 'info@matchboxpadel.com'

  const { error } = await resend.emails.send({ from, to: b.email, replyTo, subject, html })
  if (error) console.error('[email] Resend error:', error)
}

export async function sendBookingConfirmation(b: BookingForEmail): Promise<void> {
  return send(b, `Booking pending — pay within 30 min to confirm (${b.ref})`, renderPendingHtml(b))
}

export async function sendBookingConfirmed(b: BookingForEmail): Promise<void> {
  return send(b, `Booking confirmed ✓ — ${courtLabel(b.court)}, ${formatDate(b.date)} (${b.ref})`, renderConfirmedHtml(b))
}

export async function sendBookingExpired(b: BookingForEmail): Promise<void> {
  return send(b, `Booking hold expired — slot released (${b.ref})`, renderExpiredHtml(b))
}
