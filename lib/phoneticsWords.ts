// Words for the "Bolu Ya!" showcase game (/phonetics).
// Swap or add entries freely. `acceptedVariants` lists other spellings the
// speech recogniser may return (Devanagari or romanised); matching is also
// fuzzy, so variants only need to cover the bigger differences.

export type PhoneticsWord = {
  id: string;
  word: string; // Devanagari, spoken by the game and shown large
  romanised: string; // small pronunciation hint
  meaning: string; // English meaning
  emoji: string;
  acceptedVariants: string[];
};

export const PHONETICS_WORDS: PhoneticsWord[] = [
  {
    id: "tiger",
    word: "वाघ",
    romanised: "vāgh",
    meaning: "tiger",
    emoji: "🐯",
    acceptedVariants: ["वाग", "वाघा", "vagh", "wagh", "vaagh", "waagh"],
  },
  {
    id: "elephant",
    word: "हत्ती",
    romanised: "hattī",
    meaning: "elephant",
    emoji: "🐘",
    acceptedVariants: ["हत्तीं", "हत्ति", "हाथी", "hatti", "hathi", "hatthi"],
  },
  {
    id: "monkey",
    word: "माकड",
    romanised: "mākaḍ",
    meaning: "monkey",
    emoji: "🐒",
    acceptedVariants: ["माकड़", "माकडं", "makad", "maakad", "makar"],
  },
  {
    id: "cat",
    word: "मांजर",
    romanised: "mānjar",
    meaning: "cat",
    emoji: "🐱",
    acceptedVariants: ["मांजरी", "मांजरं", "मंजर", "manjar", "maanjar", "manjari"],
  },
  {
    id: "squirrel",
    word: "खारुताई",
    romanised: "khārutāī",
    meaning: "squirrel",
    emoji: "🐿️",
    acceptedVariants: ["खारूताई", "खारुताइ", "खार", "kharutai", "kharootai", "khar"],
  },
];
