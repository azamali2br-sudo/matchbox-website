import Link from "next/link";

const plans = [
  {
    label: "Off-Peak",
    time: "6:00 AM — 6:00 PM",
    price: "1,500",
    highlight: false,
    description: "Perfect for morning sessions and afternoon games. Same great courts at a better rate.",
    perks: ["Both courts available", "1 hour minimum", "30-min increments", "Instant booking"],
  },
  {
    label: "Peak",
    time: "6:00 PM — 6:00 AM",
    price: "3,250",
    highlight: true,
    description: "Prime evening slots — when the courts are alive, the energy is unmatched.",
    perks: ["Both courts available", "1 hour minimum", "30-min increments", "Evening atmosphere"],
  },
];

export default function Pricing() {
  return (
    <section className="bg-navy-dark py-16 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <p className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest mb-4">
            Pricing
          </p>
          <h2 className="font-qaranta text-4xl md:text-5xl lg:text-6xl text-white uppercase leading-tight">
            Book Your<br />Court
          </h2>
          <p className="font-poppins text-white/50 text-base mt-5 max-w-md mx-auto">
            Straightforward pricing. No hidden fees. Pay per session, your way.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.label}
              className={`relative rounded-3xl p-8 md:p-10 border transition-all duration-300 ${
                plan.highlight
                  ? "bg-orange border-orange/50 shadow-2xl shadow-orange/20"
                  : "bg-navy-card border-white/8 hover:border-orange/25"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-white text-navy font-poppins font-bold text-xs uppercase tracking-widest px-4 py-1.5 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <span
                  className={`font-poppins text-xs font-semibold uppercase tracking-widest ${
                    plan.highlight ? "text-white/70" : "text-orange"
                  }`}
                >
                  {plan.label}
                </span>
                <div className={`flex items-baseline gap-1 mt-2 ${plan.highlight ? "text-white" : "text-white"}`}>
                  <span className="font-poppins text-sm font-medium">PKR</span>
                  <span className="font-qaranta text-6xl">{plan.price}</span>
                  <span className={`font-poppins text-sm ${plan.highlight ? "text-white/70" : "text-white/50"}`}>/hr</span>
                </div>
                <p
                  className={`font-poppins text-sm font-medium mt-1 ${
                    plan.highlight ? "text-white/80" : "text-white/50"
                  }`}
                >
                  {plan.time}
                </p>
              </div>

              <p
                className={`font-poppins text-sm leading-relaxed mb-8 ${
                  plan.highlight ? "text-white/80" : "text-white/55"
                }`}
              >
                {plan.description}
              </p>

              <ul className="space-y-3 mb-10">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-3">
                    <svg
                      className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? "text-white" : "text-orange"}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                    <span
                      className={`font-poppins text-sm ${plan.highlight ? "text-white/85" : "text-white/60"}`}
                    >
                      {perk}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/booking"
                className={`block w-full text-center font-poppins font-semibold text-sm px-6 py-4 rounded-full transition-all duration-200 ${
                  plan.highlight
                    ? "bg-white text-orange hover:bg-white/90"
                    : "bg-orange hover:bg-orange-dark text-white hover:shadow-lg hover:shadow-orange/25"
                }`}
              >
                Book This Slot
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center font-poppins text-white/35 text-xs mt-8">
          Payment via bank transfer. Send screenshot to WhatsApp after booking to confirm your slot.
        </p>
      </div>
    </section>
  );
}
