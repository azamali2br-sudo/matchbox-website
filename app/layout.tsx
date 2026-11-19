import type { Metadata } from "next";
import localFont from "next/font/local";
import { Poppins } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const qaranta = localFont({
  src: "../public/fonts/qaranta-bold.otf",
  variable: "--font-qaranta",
  display: "swap",
});

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.matchboxpadel.com").trim().replace(/\/+$/, "");
const SITE_DESCRIPTION =
  "Pakistan's first tech-driven padel club. Book your court, track your ratings, and join our thriving community in Malir Cantt, Karachi.";

// Site-wide defaults. Page titles already carry "| Matchbox Padel Club", so no
// title template here. The share image comes from app/opengraph-image.jpg (+
// twitter-image.jpg) via the file convention; metadataBase makes every
// image/canonical URL absolute, which WhatsApp/Facebook previews require.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Matchbox Padel Club | Malir Cantt, Karachi",
  description: SITE_DESCRIPTION,
  keywords: "padel, padel club, Karachi, Malir Cantt, book padel court, padel Karachi, Matchbox, Match IQ, Americano",
  applicationName: "Matchbox Padel Club",
  // Only generic fields here: nested objects are replaced (not merged) by child
  // segments, and an og:title set here would leak onto every page that only
  // sets `title`. Without og:title/description, WhatsApp/Facebook use each
  // page's own <title>/<meta description>.
  openGraph: {
    type: "website",
    siteName: "Matchbox Padel Club",
    locale: "en_PK",
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport = { themeColor: "#181F49" };

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${qaranta.variable} ${poppins.variable}`}>
      <body className="bg-navy text-white antialiased min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
