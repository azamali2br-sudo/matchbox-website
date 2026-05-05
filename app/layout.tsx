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

export const metadata: Metadata = {
  title: "Matchbox Padel Club | Malir Cantt, Karachi",
  description:
    "Pakistan's first tech-driven padel club. Book your court, track your ratings, and join our thriving community in Malir Cantt, Karachi.",
  keywords: "padel, padel club, Karachi, Malir Cantt, book padel court, Matchbox",
};

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
