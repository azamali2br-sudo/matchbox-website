import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms & Privacy | Matchbox Padel Club',
  description: 'Terms of service and privacy policy for Matchbox Padel Club — Karachi.',
}

const LAST_UPDATED = '17 May 2026'

export default function TermsPage() {
  return (
    <main className="bg-navy min-h-screen pt-28 pb-24">
      <div className="max-w-3xl mx-auto px-6">
        {/* Header */}
        <div className="mb-16">
          <p className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest mb-3">
            Legal
          </p>
          <h1 className="font-qaranta text-4xl md:text-5xl lg:text-6xl text-white uppercase leading-tight mb-4">
            Terms &<br />
            <span className="text-orange">Privacy</span>
          </h1>
          <p className="font-poppins text-white/50 text-sm">
            Last updated: {LAST_UPDATED}
          </p>
        </div>

        {/* TOC */}
        <nav className="bg-navy-card border border-white/8 rounded-2xl p-6 mb-16">
          <p className="font-poppins text-white/40 text-xs uppercase tracking-widest mb-4">On this page</p>
          <ul className="space-y-2 font-poppins text-sm">
            {[
              ['#about', '1. About these terms'],
              ['#bookings', '2. Court bookings'],
              ['#payment', '3. Payment & cancellation'],
              ['#conduct', '4. Code of conduct'],
              ['#liability', '5. Liability & safety'],
              ['#match-iq', '6. Match IQ ratings'],
              ['#privacy', '7. Privacy — what we collect'],
              ['#privacy-use', '8. How we use your data'],
              ['#privacy-share', '9. Who we share data with'],
              ['#privacy-security', '10. How we protect it'],
              ['#cookies', '11. Cookies & tracking'],
              ['#rights', '12. Your rights'],
              ['#changes', '13. Changes to these terms'],
              ['#contact', '14. Contact us'],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="text-white/70 hover:text-orange transition-colors">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sections */}
        <article className="prose-content font-poppins text-white/70 text-sm leading-relaxed space-y-12">

          <Section id="about" title="1. About these terms">
            <p>
              Matchbox Padel Club (&ldquo;Matchbox&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates a padel facility in Malir Cantt, Karachi, Pakistan, along with this website at matchboxpadel.com. By booking a court, submitting a match, or using this site, you agree to the terms below.
            </p>
            <p>
              These terms are governed by the laws of the Islamic Republic of Pakistan. Any dispute is subject to the exclusive jurisdiction of the courts in Karachi.
            </p>
          </Section>

          <Section id="bookings" title="2. Court bookings">
            <p>
              Bookings are made online or via WhatsApp on a first-come, first-served basis. When you book online, your slot is held for 30 minutes pending payment. If payment is not received within that window, the slot is automatically released.
            </p>
            <p>
              We reserve the right to cancel or reschedule any booking due to weather, maintenance, power outages, or other circumstances beyond our control. In such cases you will be offered a free reschedule or a full refund.
            </p>
          </Section>

          <Section id="payment" title="3. Payment & cancellation">
            <p>
              Payment is by bank transfer to the account shown on your booking confirmation. Send the payment screenshot to our WhatsApp number within the 30-minute hold window to confirm your slot.
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Cancellations 24+ hours in advance:</strong> full refund or free reschedule.</li>
              <li><strong className="text-white">Cancellations less than 24 hours in advance:</strong> no refund; one free reschedule may be offered at our discretion.</li>
              <li><strong className="text-white">No-shows:</strong> no refund.</li>
            </ul>
            <p>
              Off-peak rate (6 AM–6 PM) is PKR 1,500/hr. Peak rate (6 PM–6 AM) is PKR 3,250/hr. Prices may change with notice posted on this site.
            </p>
          </Section>

          <Section id="conduct" title="4. Code of conduct">
            <p>
              Padel is a social sport. We expect all players to treat each other, staff, and equipment with respect. Matchbox reserves the right to refuse service or remove anyone from the premises for abusive behaviour, damage to property, or violation of these terms — without refund.
            </p>
            <p>
              Proper padel or court shoes are required on court. No food on court. Outside drinks are permitted except glass containers.
            </p>
          </Section>

          <Section id="liability" title="5. Liability & safety">
            <p>
              Padel is a physical sport and carries a risk of injury. By playing at Matchbox, you acknowledge this risk and agree that you play at your own risk. Matchbox is not liable for personal injury, illness, or loss of personal belongings on the premises, except where caused by our gross negligence.
            </p>
            <p>
              You are responsible for ensuring you are physically fit to play. If you have a medical condition, please consult your doctor before playing.
            </p>
          </Section>

          <Section id="match-iq" title="6. Match IQ ratings">
            <p>
              Match IQ is our community-submitted player rating system based on the Elo formula. Match results are submitted by players and reviewed by Matchbox staff before affecting ratings. We reserve the right to reject any submission we believe to be inaccurate, fabricated, or submitted in bad faith.
            </p>
            <p>
              Ratings, win/loss records, and a public leaderboard are visible to all visitors. If you do not want your name to appear publicly, please contact us before submitting a match.
            </p>
          </Section>

          <Section id="privacy" title="7. Privacy — what we collect">
            <p>We collect only what we need to operate. Specifically:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Booking details:</strong> your name, phone number, email address, and booking history (court, date, time, amount).</li>
              <li><strong className="text-white">Match IQ submissions:</strong> player names and phone numbers from match submissions; rating history.</li>
              <li><strong className="text-white">Communications:</strong> WhatsApp messages and emails you send us, retained for service history.</li>
              <li><strong className="text-white">Technical:</strong> we do <em>not</em> use Google Analytics, Facebook Pixel, advertising trackers, or third-party analytics. Our hosting provider (Vercel) logs basic request data (IP, user agent) for security and performance — this is not used for marketing.</li>
            </ul>
          </Section>

          <Section id="privacy-use" title="8. How we use your data">
            <ul className="list-disc pl-6 space-y-2">
              <li>To confirm and manage your bookings.</li>
              <li>To send booking confirmations and reminders via email (through our email provider, Resend).</li>
              <li>To contact you on WhatsApp about your booking or about Matchbox events you have asked about.</li>
              <li>To operate the Match IQ leaderboard and player profiles.</li>
              <li>To improve our service based on aggregate, anonymous usage patterns.</li>
            </ul>
            <p>We do <strong>not</strong> sell your data, rent it, or share it with marketing partners.</p>
          </Section>

          <Section id="privacy-share" title="9. Who we share data with">
            <p>We share the minimum data necessary with the following service providers, who are contractually bound to protect it:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">Supabase</strong> — our database provider; stores bookings and Match IQ data.</li>
              <li><strong className="text-white">Vercel</strong> — our hosting provider; runs the website.</li>
              <li><strong className="text-white">Resend</strong> — our email provider; sends booking confirmations.</li>
              <li><strong className="text-white">WhatsApp / Meta</strong> — when you message us, your message is handled by WhatsApp under their own policy.</li>
            </ul>
            <p>
              We may disclose data if required by Pakistani law, court order, or to protect our rights, our staff, or the public.
            </p>
          </Section>

          <Section id="privacy-security" title="10. How we protect it">
            <p>Security measures we apply:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Data is encrypted in transit (HTTPS) and at rest by Supabase.</li>
              <li>Row-level security policies in our database prevent unauthorised access to customer records.</li>
              <li>Admin access is protected by a strong password, signed session cookies, and rate-limited login attempts.</li>
              <li>Customer contact details are never exposed in public API responses.</li>
              <li>Secrets (API keys, passwords) are rotated periodically.</li>
            </ul>
            <p>
              No system is 100% secure. If we ever detect a breach involving your personal data, we will notify affected users by email within 7 days.
            </p>
          </Section>

          <Section id="cookies" title="11. Cookies & tracking">
            <p>
              We use a single technical cookie (<code className="text-orange text-xs">mbx_admin_session</code>) only when an administrator logs into the admin panel. It is necessary for the admin login to work and is not used for any tracking.
            </p>
            <p>
              We do not use advertising cookies, social media trackers, or behavioural analytics. Public visitors do not receive any cookies from us.
            </p>
          </Section>

          <Section id="rights" title="12. Your rights">
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Request a copy of the personal data we hold about you.</li>
              <li>Ask us to correct any inaccurate information.</li>
              <li>Ask us to delete your data and remove your name from Match IQ (we&apos;ll retain only what we&apos;re required to keep for tax/accounting purposes).</li>
              <li>Withdraw consent for promotional WhatsApp messages at any time.</li>
            </ul>
            <p>To exercise any of these rights, message us on WhatsApp at +92 322 217 2629.</p>
          </Section>

          <Section id="changes" title="13. Changes to these terms">
            <p>
              We may update these terms occasionally as our service evolves or as the law changes. The &ldquo;Last updated&rdquo; date at the top of this page will reflect the most recent change. Material changes will be announced on our website and via our WhatsApp community.
            </p>
          </Section>

          <Section id="contact" title="14. Contact us">
            <p>For any questions about these terms or about your personal data:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong className="text-white">WhatsApp:</strong> <a href="https://wa.me/923222172629" className="text-orange hover:underline">+92 322 217 2629</a></li>
              <li><strong className="text-white">Location:</strong> Matchbox Padel Club, Malir Cantt, Karachi</li>
            </ul>
          </Section>

        </article>

        <div className="mt-20 pt-8 border-t border-white/10 text-center">
          <Link href="/" className="font-poppins text-orange hover:underline text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-qaranta text-2xl md:text-3xl text-white uppercase mb-5">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  )
}
