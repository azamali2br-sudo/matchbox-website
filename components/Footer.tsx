import Link from "next/link";
import Image from "next/image";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Book a Court", href: "/booking" },
  { label: "Leagues & Tournaments", href: "/leagues" },
  { label: "Match IQ", href: "/match-iq" },
];

export default function Footer() {
  return (
    <footer className="bg-navy-dark border-t border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="col-span-1 md:col-span-1">
            <Image
              src="/logos/Matchbox-SecondaryLogo-02.png"
              alt="Matchbox Padel Club"
              width={280}
              height={72}
              className="h-16 w-auto mb-6"
            />
            <p className="font-poppins text-white/50 text-sm leading-relaxed max-w-xs">
              Pakistan&apos;s first tech-driven padel club. Play, compete, and belong in Malir Cantt, Karachi.
            </p>
          </div>

          <div>
            <h4 className="font-qaranta text-white uppercase text-lg mb-5">Navigation</h4>
            <ul className="space-y-3">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="font-poppins text-white/50 hover:text-orange text-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-qaranta text-white uppercase text-lg mb-5">Contact</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://wa.me/923222172629"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-poppins text-white/50 hover:text-orange text-sm transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-orange flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  +92 322 2172629
                </a>
              </li>
              <li>
                <a
                  href="https://maps.app.goo.gl/fv8JrRiBJFiSrWJh7"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-poppins text-white/50 hover:text-orange text-sm transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4 text-orange flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Malir Cantt, Karachi
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-poppins text-white/30 text-xs">
            &copy; {new Date().getFullYear()} Matchbox Padel Club. All rights reserved.
          </p>
          <div className="flex items-center gap-5">
            <Link href="/terms" className="font-poppins text-white/40 hover:text-orange text-xs transition-colors">
              Terms &amp; Privacy
            </Link>
            <p className="font-poppins text-white/30 text-xs">
              matchboxpadel.com
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
