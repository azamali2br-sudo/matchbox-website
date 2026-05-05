import Link from "next/link";
import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative min-h-screen bg-navy flex items-center overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -right-32 -top-32 w-[520px] h-[520px] bg-orange/10 rotate-45"
          style={{ borderRadius: "40px" }}
        />
        <div
          className="absolute right-24 bottom-24 w-48 h-48 bg-orange/8 rotate-12"
          style={{ borderRadius: "16px" }}
        />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 w-full pt-32 pb-24 grid grid-cols-1 lg:grid-cols-[1fr_440px] xl:grid-cols-[1fr_500px] gap-12 xl:gap-20 items-center">
        <div>
          <div className="inline-flex items-center gap-2 bg-orange/10 border border-orange/25 rounded-full px-4 py-2 mb-10">
            <span className="w-2 h-2 rounded-full bg-orange animate-pulse" />
            <span className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest">
              Pakistan&apos;s First Tech-Driven Padel Club
            </span>
          </div>

          <h1
            className="font-qaranta uppercase leading-none text-white mb-8"
            style={{ fontSize: "clamp(64px, 9vw, 112px)" }}
          >
            Play.<br />
            Compete.<br />
            <span className="text-orange">Belong.</span>
          </h1>

          <p className="font-poppins text-white/65 text-lg md:text-xl leading-relaxed mb-12 max-w-xl">
            Two premium courts. A 1,000+ strong community. An elite player rating system.
            Matchbox is Malir Cantt&apos;s home of padel.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-20">
            <Link
              href="/booking"
              className="inline-flex items-center justify-center bg-orange hover:bg-orange-dark text-white font-poppins font-semibold text-sm px-8 py-4 rounded-full transition-all duration-200 hover:shadow-xl hover:shadow-orange/30 hover:-translate-y-0.5"
            >
              Book a Court
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <a
              href="https://wa.me/923222172629"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center border border-white/25 hover:border-orange/60 hover:bg-orange/5 text-white font-poppins font-semibold text-sm px-8 py-4 rounded-full transition-all duration-200"
            >
              <svg className="mr-2 w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Join Our Community
            </a>
          </div>

          <div className="flex flex-wrap gap-x-12 gap-y-6 pt-10 border-t border-white/10">
            {[
              { value: "2", label: "Premium Courts" },
              { value: "1,000+", label: "Community Members" },
              { value: "24/7", label: "Available to Book" },
              { value: "#1", label: "In Malir Cantt" },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-qaranta text-3xl text-orange">{stat.value}</div>
                <div className="font-poppins text-white/50 text-xs mt-1 uppercase tracking-wide">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden lg:block relative">
          <div className="relative rounded-3xl overflow-hidden" style={{ height: "620px" }}>
            <Image
              src="/images/vincenzo-morelli-OHau1zi6oLc-unsplash.jpg"
              alt="Matchbox padel player in action"
              fill
              className="object-cover object-center"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/25 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-navy to-transparent pointer-events-none" />
          </div>
          <div className="absolute -bottom-10 -right-10 w-56 h-56 bg-orange/12 rounded-full blur-3xl pointer-events-none" />
          <div
            className="absolute -top-6 -right-6 w-28 h-28 bg-orange/18 rounded-2xl rotate-12 pointer-events-none"
            style={{ filter: "blur(18px)" }}
          />
        </div>
      </div>
    </section>
  );
}
