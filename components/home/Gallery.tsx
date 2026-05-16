import Image from "next/image";

export default function Gallery() {
  return (
    <section className="bg-navy-dark py-16 md:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <p className="font-poppins text-orange text-xs font-semibold uppercase tracking-widest mb-4">
            The Experience
          </p>
          <h2 className="font-qaranta text-5xl md:text-6xl text-white uppercase leading-tight">
            Where Games<br />Are Made
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5" style={{ minHeight: "520px" }}>
          <div className="md:col-span-7 relative rounded-3xl overflow-hidden min-h-[320px] md:min-h-0">
            <Image
              src="/images/vincenzo-morelli-Cj35lHL4atY-unsplash.jpg"
              alt="Matchbox padel court overhead view"
              fill
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy/60 to-transparent pointer-events-none" />
            <div className="absolute bottom-6 left-6">
              <p className="font-poppins text-white/70 text-xs uppercase tracking-widest">Court View</p>
            </div>
          </div>

          <div className="md:col-span-5 grid grid-rows-2 gap-4 md:gap-5">
            <div className="relative rounded-3xl overflow-hidden min-h-[200px]">
              <Image
                src="/images/sergio-contreras-wLAtpQ53Pfw-unsplash.jpg"
                alt="Padel rackets on the court"
                fill
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/50 to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-5">
                <p className="font-poppins text-white/70 text-xs uppercase tracking-widest">The Arsenal</p>
              </div>
            </div>

            <div className="relative rounded-3xl overflow-hidden min-h-[200px]">
              <Image
                src="/images/jorgen-hendriksen-IPvM5oJcunY-unsplash.jpg"
                alt="Padel ball at the net"
                fill
                className="object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy/50 to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-5">
                <p className="font-poppins text-white/70 text-xs uppercase tracking-widest">Net Play</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
