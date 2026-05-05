import Link from "next/link";
import Image from "next/image";

const courts = [
  {
    id: "A",
    name: "Box A",
    tag: "Most Popular",
    tagStyle: "bg-orange text-white",
    image: "/images/bruno-vaccaro-vercellino-a4SslXtr1TE-unsplash.jpg",
    description:
      "The crowd favourite. Box A is our flagship court — fast, well-lit, and perfectly maintained. The court where rivalries are born and champions are made.",
    features: ["Pro-grade synthetic turf", "Full floodlighting", "Glass back wall", "Viewing area"],
  },
  {
    id: "B",
    name: "Box B",
    tag: "Hidden Gem",
    tagStyle: "bg-white/15 text-white border border-white/20",
    image: "/images/oliver-sjostrom-sZKLku0YnFM-unsplash.jpg",
    description:
      "Don't sleep on Box B. Same international-standard build, same great padel — just waiting for you to discover why regulars are quietly making it their first choice.",
    features: ["Pro-grade synthetic turf", "Full floodlighting", "Glass back wall", "Premium feel"],
  },
];

export default function Courts() {
  return (
    <section className="bg-navy py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <p className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest mb-4">
              Our Courts
            </p>
            <h2 className="font-qaranta text-5xl md:text-6xl text-white uppercase leading-tight">
              Pick Your<br />Arena
            </h2>
          </div>
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 bg-orange hover:bg-orange-dark text-white font-poppins font-semibold text-sm px-7 py-3.5 rounded-full transition-all duration-200 self-start md:self-auto hover:shadow-lg hover:shadow-orange/25"
          >
            Book a Court
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {courts.map((court) => (
            <div
              key={court.id}
              className="relative bg-navy-card rounded-3xl border border-white/8 overflow-hidden group hover:border-orange/30 transition-all duration-300"
            >
              <div className="relative h-56 overflow-hidden">
                <Image
                  src={court.image}
                  alt={`${court.name} at Matchbox Padel`}
                  fill
                  className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-navy/85 pointer-events-none" />
                <div className="absolute top-4 right-4">
                  <span className={`font-poppins text-xs font-semibold uppercase tracking-wide px-3 py-1.5 rounded-full ${court.tagStyle}`}>
                    {court.tag}
                  </span>
                </div>
                <div className="absolute bottom-4 left-6">
                  <span className="font-qaranta text-5xl text-white/15 leading-none select-none">{court.id}</span>
                </div>
              </div>

              <div className="p-8 md:p-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-orange/10 border border-orange/20 flex items-center justify-center">
                    <span className="font-qaranta text-2xl text-orange">{court.id}</span>
                  </div>
                  <h3 className="font-qaranta text-3xl text-white uppercase group-hover:text-orange transition-colors">
                    {court.name}
                  </h3>
                </div>

                <p className="font-poppins text-white/60 text-sm leading-relaxed mb-8">
                  {court.description}
                </p>

                <ul className="grid grid-cols-2 gap-2.5">
                  {court.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange flex-shrink-0" />
                      <span className="font-poppins text-white/55 text-xs">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
