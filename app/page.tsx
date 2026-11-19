import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import Gallery from "@/components/home/Gallery";
import Courts from "@/components/home/Courts";
import Pricing from "@/components/home/Pricing";
import MatchIQTeaser from "@/components/home/MatchIQTeaser";
import LeaguesTeaser from "@/components/home/LeaguesTeaser";
import Location from "@/components/home/Location";
import { WHATSAPP_NUMBER, OFF_PEAK_PRICE_PER_HOUR, PEAK_PRICE_PER_HOUR } from "@/lib/constants";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.matchboxpadel.com").trim().replace(/\/+$/, "");

export const metadata = { alternates: { canonical: "/" } };

// Structured data for Google's local results (name, phone, address, hours,
// price range). Hours mirror the booking rules: closed 09:00–15:00 PKT, so open
// 15:00 → 09:00 the next morning, every day.
const localBusiness = {
  "@context": "https://schema.org",
  "@type": "SportsActivityLocation",
  name: "Matchbox Padel Club",
  description: "Pakistan's first tech-driven padel club — two courts, Match IQ ratings and a 1,000+ player community in Malir Cantt, Karachi.",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.png`,
  image: `${SITE_URL}/opengraph-image.jpg`,
  telephone: `+${WHATSAPP_NUMBER}`,
  priceRange: `PKR ${OFF_PEAK_PRICE_PER_HOUR.toLocaleString()}–${PEAK_PRICE_PER_HOUR.toLocaleString()} per hour`,
  currenciesAccepted: "PKR",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Malir Cantt, Karachi",
    addressRegion: "Sindh",
    addressCountry: "PK",
  },
  hasMap: "https://maps.app.goo.gl/fv8JrRiBJFiSrWJh7",
  openingHoursSpecification: [{
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
    opens: "15:00",
    closes: "09:00",
  }],
  sport: "Padel",
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness).replace(/</g, "\\u003c") }}
      />
      <Hero />
      <Features />
      <Gallery />
      <Courts />
      <Pricing />
      <MatchIQTeaser />
      <LeaguesTeaser />
      <Location />
    </>
  );
}
