import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SHOW_PHONETICS } from "@/lib/features";
import { Baloo_2 } from "next/font/google";
import BoluYaGame from "./bolu-ya-game";

// Playful font with Devanagari support (self-hosted by next/font, no runtime request).
const baloo = Baloo_2({ subsets: ["devanagari", "latin"], weight: ["500", "700", "800"] });

export const metadata: Metadata = {
  title: "Bolu Ya! – Say the Animal (बोलू या!)",
  description: "Speak Marathi animal words with Clever Monkey",
};

export default function PhoneticsPage() {
  if (!SHOW_PHONETICS) notFound(); // hidden for now, see lib/features.ts
  return <BoluYaGame fontClass={baloo.className} />;
}
