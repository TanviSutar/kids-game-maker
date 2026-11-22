import type { Metadata } from "next";
import { Baloo_2 } from "next/font/google";
import BoluYaGame from "./bolu-ya-game";

// Playful font with Devanagari support (self-hosted by next/font, no runtime request).
const baloo = Baloo_2({ subsets: ["devanagari", "latin"], weight: ["500", "700", "800"] });

export const metadata: Metadata = {
  title: "Bolu Ya! – Say the Animal (बोलू या!)",
  description: "Speak Marathi animal words with Clever Monkey",
};

export default function PhoneticsPage() {
  return <BoluYaGame fontClass={baloo.className} />;
}
