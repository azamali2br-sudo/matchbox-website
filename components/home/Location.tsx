export default function Location() {
  return (
    <section className="bg-navy py-24 md:py-32">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-14">
          <p className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest mb-4">
            Find Us
          </p>
          <h2 className="font-qaranta text-5xl md:text-6xl text-white uppercase leading-tight">
            Come Play
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map embed */}
          <div className="lg:col-span-2 rounded-3xl overflow-hidden border border-white/8 min-h-[380px] bg-navy-card relative">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3619.9!2d67.19!3d24.93!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDU1JzQ4LjAiTiA2N8KwMTEnMjQuMCJF!5e0!3m2!1sen!2spk!4v1620000000000!5m2!1sen!2spk"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: "380px", filter: "invert(90%) hue-rotate(180deg)" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Matchbox Padel Club Location"
              className="absolute inset-0 w-full h-full"
            />
          </div>

          {/* Contact cards */}
          <div className="flex flex-col gap-5">
            {/* Address card */}
            <div className="bg-navy-card rounded-2xl p-7 border border-white/8 flex-1">
              <div className="w-11 h-11 rounded-xl bg-orange/10 border border-orange/20 flex items-center justify-center mb-5">
                <svg className="w-5 h-5 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-qaranta text-xl text-white uppercase mb-2">Location</h3>
              <p className="font-poppins text-white/55 text-sm leading-relaxed mb-5">
                Malir Cantt, Karachi<br />Pakistan
              </p>
              <a
                href="https://maps.app.goo.gl/fv8JrRiBJFiSrWJh7"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-poppins text-orange text-sm font-semibold hover:underline"
              >
                Get Directions
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>

            {/* WhatsApp card */}
            <div className="bg-navy-card rounded-2xl p-7 border border-white/8">
              <div className="w-11 h-11 rounded-xl bg-orange/10 border border-orange/20 flex items-center justify-center mb-5">
                <svg className="w-5 h-5 text-orange" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <h3 className="font-qaranta text-xl text-white uppercase mb-2">WhatsApp Us</h3>
              <p className="font-poppins text-white/55 text-sm leading-relaxed mb-5">
                Bookings, payments, questions — we&apos;re on WhatsApp.
              </p>
              <a
                href="https://wa.me/923222172629"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-poppins text-orange text-sm font-semibold hover:underline"
              >
                +92 322 2172629
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </div>

            {/* Hours card */}
            <div className="bg-navy-card rounded-2xl p-7 border border-white/8">
              <div className="w-11 h-11 rounded-xl bg-orange/10 border border-orange/20 flex items-center justify-center mb-5">
                <svg className="w-5 h-5 text-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-qaranta text-xl text-white uppercase mb-3">Hours</h3>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-poppins text-white/55 text-xs">Off-Peak</span>
                  <span className="font-poppins text-white/80 text-xs font-medium">6 AM – 6 PM</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-poppins text-white/55 text-xs">Peak</span>
                  <span className="font-poppins text-white/80 text-xs font-medium">6 PM – 6 AM</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/8 mt-2">
                  <span className="font-poppins text-orange text-xs font-semibold">Open</span>
                  <span className="font-poppins text-orange text-xs font-semibold">24/7</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
