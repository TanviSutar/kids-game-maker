// Animated ("GIF-like") emoji for the loading screen, self-hosted in
// public/emoji/. From Google's Noto Animated Emoji, licensed CC BY 4.0
// (credit shown on the loading screen; see public/emoji/CREDITS.md).
// Heroes without an animated version here fall back to their bouncing emoji.

export const ANIMATED_HERO_EMOJI: Record<string, string> = {
  hanuman: "/emoji/hanuman.webp", // 🐒
  "clever-monkey": "/emoji/clever-monkey.webp", // 🙈 (no animated 🐵 exists)
  "wise-crow": "/emoji/wise-crow.webp", // 🐦‍⬛
  "brave-rabbit": "/emoji/brave-rabbit.webp", // 🐇 (no animated 🐰 exists)
  "elephant-shopkeeper": "/emoji/elephant-shopkeeper.webp", // 🛒
  surprise: "/emoji/surprise.webp", // 🎲
};

export const MAGIC_WAND_EMOJI = "/emoji/magic-wand.webp"; // 🪄
