import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Book a Court | Matchbox Padel Club",
  description: "Book Box A or Box B at Matchbox Padel Club, Malir Cantt. Available 24/7.",
};

export default function BookingPage() {
  return (
    <section className="min-h-screen bg-navy flex items-center justify-center pt-20">
      <div className="max-w-2xl mx-auto px-6 py-24 text-center">
        <div className="w-20 h-20 rounded-2xl bg-orange/10 border border-orange/25 flex items-center justify-center mx-auto mb-8">
          <svg className="w-9 h-9 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>

        <div className="inline-flex items-center gap-2 bg-orange/10 border border-orange/25 rounded-full px-4 py-2 mb-8">
          <span className="w-2 h-2 rounded-full bg-orange animate-pulse" />
          <span className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest">Coming Soon</span>
        </div>

        <h1 className="font-qaranta text-5xl md:text-6xl text-white uppercase leading-tight mb-6">
          Booking<br />
          <span className="text-orange">Online Soon</span>
        </h1>

        <p className="font-poppins text-white/60 text-base leading-relaxed mb-10 max-w-md mx-auto">
          Our online booking system is being built. In the meantime, book your court directly
          on WhatsApp — we respond fast.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://wa.me/923222172629"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-orange hover:bg-orange-dark text-white font-poppins font-semibold text-sm px-8 py-4 rounded-full transition-all duration-200 hover:shadow-xl hover:shadow-orange/30"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Book on WhatsApp
          </a>
          <Link
            href="/"
            className="inline-flex items-center justify-center border border-white/20 hover:border-white/40 text-white font-poppins font-semibold text-sm px-8 py-4 rounded-full transition-colors duration-200"
          >
            Back to Home
          </Link>
        </div>

        <div className="mt-16 pt-10 border-t border-white/10 grid grid-cols-2 gap-6 max-w-sm mx-auto">
          <div className="text-center">
            <div className="font-qaranta text-3xl text-orange">PKR 1,500</div>
            <div className="font-poppins text-white/40 text-xs mt-1">Off-Peak / hour</div>
          </div>
          <div className="text-center">
            <div className="font-qaranta text-3xl text-orange">PKR 3,250</div>
            <div className="font-poppins text-white/40 text-xs mt-1">Peak / hour</div>
          </div>
        </div>
      </div>
    </section>
  );
}
