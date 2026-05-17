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

function renderHtml(b: BookingForEmail): string {
  const expiryLine = b.holdExpiresAt
    ? new Date(b.holdExpiresAt).toLocaleTimeString('en-PK', { hour: 'numeric', minute: '2-digit' })
    : '30 minutes from now'
  const courtLabel = b.court === 'A' ? 'Box A' : 'Box B'
  const waLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi! Payment screenshot for booking ${b.ref} (${courtLabel}, ${formatDate(b.date)}, ${formatTime(b.startTime)}–${formatTime(b.endTime)})`,
  )}`

  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f4f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f6;padding:24px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;max-width:560px">
        <tr><td style="background:${NAVY};padding:28px 32px">
          <div style="color:#fff;font-size:22px;font-weight:700;letter-spacing:.5px">MATCHBOX</div>
          <div style="color:${ORANGE};font-size:13px;margin-top:4px">Booking pending — payment required</div>
        </td></tr>
        <tr><td style="padding:28px 32px">
          <p style="margin:0 0 16px;font-size:15px;line-height:1.5">Hey ${b.name},</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5">Your slot is reserved. To confirm, please complete payment within <strong>30 minutes</strong> (by <strong>${expiryLine}</strong>) and send the screenshot on WhatsApp.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;margin:0 0 20px">
            <tr><td style="padding:14px 16px;border-bottom:1px solid #e5e7eb"><div style="font-size:12px;color:#6b7280">Booking ref</div><div style="font-size:15px;font-weight:600">${b.ref}</div></td></tr>
            <tr><td style="padding:14px 16px;border-bottom:1px solid #e5e7eb"><div style="font-size:12px;color:#6b7280">Court</div><div style="font-size:15px;font-weight:600">${courtLabel}</div></td></tr>
            <tr><td style="padding:14px 16px;border-bottom:1px solid #e5e7eb"><div style="font-size:12px;color:#6b7280">Date</div><div style="font-size:15px;font-weight:600">${formatDate(b.date)}</div></td></tr>
            <tr><td style="padding:14px 16px;border-bottom:1px solid #e5e7eb"><div style="font-size:12px;color:#6b7280">Time</div><div style="font-size:15px;font-weight:600">${formatTime(b.startTime)} – ${formatTime(b.endTime)} (${b.durationHours}h)</div></td></tr>
            <tr><td style="padding:14px 16px"><div style="font-size:12px;color:#6b7280">Amount</div><div style="font-size:18px;font-weight:700;color:${ORANGE}">${formatCurrency(b.totalPrice)}</div></td></tr>
          </table>

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

          <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.5">If payment isn't received within 30 minutes, the slot will be released automatically. No charge.</p>
        </td></tr>
        <tr><td style="background:${NAVY};padding:18px 32px;text-align:center">
          <div style="color:#94a3b8;font-size:12px">Matchbox Padel Club · Malir Cantt, Karachi</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export async function sendBookingConfirmation(b: BookingForEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping booking confirmation email')
    return
  }

  const resend = new Resend(apiKey)
  const from = process.env.EMAIL_FROM || 'Matchbox <onboarding@resend.dev>'
  const replyTo = process.env.EMAIL_REPLY_TO || 'info@matchboxpadel.com'

  const { error } = await resend.emails.send({
    from,
    to: b.email,
    replyTo,
    subject: `Booking pending — pay within 30 min to confirm (${b.ref})`,
    html: renderHtml(b),
  })

  if (error) {
    console.error('[email] Resend error:', error)
  }
}
