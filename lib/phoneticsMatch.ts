// Forgiving matching of what the speech recogniser heard against a target
// word. Pure functions, no imports at runtime, so it can be unit tested with
// `npm test` (Node's built-in test runner).

import type { PhoneticsWord } from "./phoneticsWords";

const NUKTA = "़";
const ANUSVARA = "ं";
const CHANDRABINDU = "ँ";
const VISARGA = "ः";
const VIRAMA = "्";

// Long vowel -> short vowel, so ī/i and ū/u differences don't matter.
const VOWEL_LENGTH: Record<string, string> = {
  "ी": "ि", // ी -> ि
  "ू": "ु", // ू -> ु
  "ई": "इ", // ई -> इ
  "ऊ": "उ", // ऊ -> उ
};

const DEVANAGARI = /[ऀ-ॿ]/;

/** Normalise one word/phrase for comparison (Devanagari or romanised). */
export function normalise(text: string): string {
  if (DEVANAGARI.test(text)) {
    return (
      text
        .normalize("NFD") // splits precomposed nukta letters like ड़ into ड + ़
        .replace(/[^ऀ-ॿ]/g, "") // drop spaces, punctuation, Latin, digits
        .replace(/[।॥]/g, "") // । ॥
        .replaceAll(NUKTA, "")
        .replaceAll(ANUSVARA, "")
        .replaceAll(CHANDRABINDU, "")
        .replaceAll(VISARGA, "")
        .replace(/[ीूईऊ]/g, (ch) => VOWEL_LENGTH[ch])
        .replace(new RegExp(`${VIRAMA}$`), "") // trailing halant
        .normalize("NFC")
    );
  }
  // Romanised: strip accents (ā -> a, ḍ -> d), lowercase, collapse long vowels.
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/w/g, "v");
}

/** Classic Levenshtein edit distance (insert / delete / substitute = 1). */
export function levenshtein(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const curr = [i];
    for (let j = 1; j <= y.length; j++) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[y.length];
}

/** Allowed edits: 1 for short words, 2 for longer ones like खारुताई. */
export function allowedDistance(normalisedTarget: string): number {
  return [...normalisedTarget].length >= 6 ? 2 : 1;
}

export type MatchDetail = {
  heard: string; // the piece of the transcript that was compared
  against: string; // the target/variant it was compared with
  distance: number;
  matched: boolean;
};

export type MatchResult = {
  matched: boolean;
  best: MatchDetail | null; // closest comparison, for the debug panel
};

/**
 * Is any recogniser alternative close enough to the word?
 * Each alternative is checked as a whole and word-by-word, so
 * "हा वाघ आहे" ("this is a tiger") also counts.
 */
export function matchTranscripts(
  alternatives: string[],
  word: Pick<PhoneticsWord, "word" | "acceptedVariants">,
): MatchResult {
  const targets = [word.word, ...word.acceptedVariants]
    .map(normalise)
    .filter(Boolean);

  let best: MatchDetail | null = null;
  for (const alt of alternatives) {
    const pieces = [alt, ...alt.split(/\s+/)].map(normalise).filter(Boolean);
    for (const heard of pieces) {
      for (const target of targets) {
        // Don't compare Devanagari with romanised text.
        if (DEVANAGARI.test(heard) !== DEVANAGARI.test(target)) continue;
        const distance = levenshtein(heard, target);
        const matched = distance <= allowedDistance(target);
        if (!best || distance < best.distance) {
          best = { heard, against: target, distance, matched };
        }
        if (matched) return { matched: true, best: { heard, against: target, distance, matched } };
      }
    }
  }
  return { matched: false, best };
}
