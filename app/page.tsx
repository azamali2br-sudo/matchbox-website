import Hero from "@/components/home/Hero";
import Features from "@/components/home/Features";
import Gallery from "@/components/home/Gallery";
import Courts from "@/components/home/Courts";
import Pricing from "@/components/home/Pricing";
import MatchIQTeaser from "@/components/home/MatchIQTeaser";
import LeaguesTeaser from "@/components/home/LeaguesTeaser";
import Location from "@/components/home/Location";

export default function HomePage() {
  return (
    <>
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
