"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ANIMATED_HERO_EMOJI, MAGIC_WAND_EMOJI } from "@/lib/animatedEmoji";
import { CHARACTERS, SURPRISE_ID } from "@/lib/characters";
import { SHOW_PHONETICS } from "@/lib/features";
import {
  AGE_GROUPS,
  LANGUAGES,
  type AgeGroup,
  type GenerateRequest,
  type Language,
} from "@/lib/gameOptions";

const LESSON_SUGGESTIONS = [
  "Counting to 10",
  "Colours",
  "Profit and loss",
  "Sharing with friends",
  "Healthy food",
];

const HERO_CARDS = [
  ...CHARACTERS,
  { id: SURPRISE_ID, name: "Surprise me", emoji: "🎲" },
];

type Screen =
  | { kind: "form" }
  | { kind: "loading" }
  | { kind: "game"; html: string }
  | { kind: "error"; message: string };

// Shared look for every tappable choice: big, rounded, clear selected state.
function choiceClass(selected: boolean) {
  return [
    "min-h-12 rounded-2xl border-4 font-semibold transition active:scale-95",
    selected
      ? "border-orange-500 bg-orange-100 text-orange-900 shadow-md"
      : "border-amber-200 bg-white text-stone-700 hover:border-amber-300",
  ].join(" ");
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-xl font-bold text-stone-800">{children}</h2>;
}

// Animated emoji image that shows the plain emoji until the image has loaded
// (or if it fails), so there's never an empty gap.
function AnimatedEmoji({
  src,
  fallback,
  size,
  className = "",
}: {
  src?: string;
  fallback: string;
  size: number;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const showImage = src && !failed;
  return (
    <span
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {(!showImage || !loaded) && (
        <span className="animate-bounce leading-none" style={{ fontSize: size * 0.75 }}>
          {fallback}
        </span>
      )}
      {showImage && (
        <Image
          src={src}
          alt=""
          width={size}
          height={size}
          unoptimized
          priority
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </span>
  );
}

function LoadingScreen({
  heroId,
  heroName,
  heroEmoji,
}: {
  heroId: string;
  heroName: string;
  heroEmoji: string;
}) {
  const messages = [
    `${heroName} is building your game…`,
    "Counting the laddoos…",
    "Painting with happy colours…",
    "Picking the ripest mangoes…",
    "Almost ready!",
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () => setIndex((i) => Math.min(i + 1, messages.length - 1)),
      6000,
    );
    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-amber-100 via-orange-100 to-pink-100 p-6 text-center"
    >
      <div className="relative">
        <AnimatedEmoji src={ANIMATED_HERO_EMOJI[heroId]} fallback={heroEmoji} size={160} />
        <AnimatedEmoji
          src={MAGIC_WAND_EMOJI}
          fallback="🪄"
          size={72}
          className="absolute -right-12 -top-4 rotate-12"
        />
      </div>
      <p className="text-2xl font-bold text-stone-800">{messages[index]}</p>
      <p className="text-stone-600">This can take up to a minute ⏳</p>
      <p className="absolute bottom-3 text-[10px] text-stone-400">
        Animated emoji: Google Noto, CC BY 4.0
      </p>
    </div>
  );
}

export default function GameMakerForm() {
  const [lesson, setLesson] = useState("");
  const [heroId, setHeroId] = useState<string | null>(null);
  const [age, setAge] = useState<AgeGroup | null>(null);
  const [language, setLanguage] = useState<Language>("English");
  const [screen, setScreen] = useState<Screen>({ kind: "form" });

  const canSubmit = lesson.trim() !== "" && heroId !== null && age !== null;
  const hero = HERO_CARDS.find((c) => c.id === heroId);

  async function makeGame() {
    if (!lesson.trim() || !heroId || !age) return;
    setScreen({ kind: "loading" });
    const body: GenerateRequest = { lesson: lesson.trim(), characterId: heroId, age, language };
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.html !== "string") {
        setScreen({ kind: "error", message: data.error ?? "Something went wrong. Please try again." });
        return;
      }
      setScreen({ kind: "game", html: data.html });
    } catch {
      setScreen({ kind: "error", message: "We couldn't reach the game maker. Check your internet and try again." });
    }
  }

  const backToForm = () => setScreen({ kind: "form" });

  return (
    <>
      {screen.kind === "loading" && hero && (
        <LoadingScreen
          heroId={hero.id}
          heroName={hero.id === SURPRISE_ID ? "Your surprise hero" : hero.name}
          heroEmoji={hero.emoji}
        />
      )}

      {screen.kind === "error" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-amber-50 p-6 text-center">
          <div className="text-7xl" aria-hidden>🙈</div>
          <h2 className="text-2xl font-bold text-stone-800">Oops! The game got stuck.</h2>
          <p className="max-w-sm text-lg text-stone-600">{screen.message}</p>
          <button
            type="button"
            onClick={makeGame}
            className="min-h-14 w-full max-w-xs rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-xl font-bold text-white shadow-lg active:scale-95"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={backToForm}
            className="min-h-12 px-6 font-semibold text-stone-600 underline"
          >
            Change my choices
          </button>
        </div>
      )}

      {screen.kind === "game" && (
        <div className="fixed inset-0 z-50 bg-white">
          <iframe
            title="Your game"
            srcDoc={screen.html}
            sandbox="allow-scripts"
            className="h-full w-full border-0"
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-2">
            <button
              type="button"
              onClick={backToForm}
              className="pointer-events-auto min-h-12 rounded-full bg-black/50 px-4 font-semibold text-white backdrop-blur active:scale-95"
            >
              ✕ Back
            </button>
            <button
              type="button"
              onClick={makeGame}
              className="pointer-events-auto min-h-12 rounded-full bg-black/50 px-4 font-semibold text-white backdrop-blur active:scale-95"
            >
              🔄 Make another
            </button>
          </div>
        </div>
      )}

      {/* The form stays mounted underneath so choices are kept when going back. */}
      <div
        aria-hidden={screen.kind !== "form"}
        className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-6"
      >
        {/* 1. Header */}
        <header className="rounded-3xl bg-gradient-to-br from-orange-400 to-pink-500 px-5 py-6 text-center text-white shadow-lg">
          <h1 className="text-3xl font-extrabold">🎮 Kids Game Maker</h1>
          <p className="mt-2 text-lg">Turn any lesson into a 3-minute game</p>
        </header>

        {/* Showcase game (hidden for now, see lib/features.ts) */}
        {SHOW_PHONETICS && (
          <Link
            href="/phonetics"
            className="flex min-h-20 items-center gap-4 rounded-3xl border-4 border-yellow-300 bg-gradient-to-r from-yellow-100 to-amber-100 p-4 shadow-md transition active:scale-95"
          >
            <span className="text-5xl" aria-hidden>🐵</span>
            <span className="flex flex-col">
              <span className="text-lg font-extrabold text-amber-900">⭐ Showcase: Speak Marathi animal words</span>
              <span className="text-stone-600">बोलू या! – Say the Animal</span>
            </span>
            <span className="ml-auto text-2xl" aria-hidden>➡️</span>
          </Link>
        )}

        {/* 2. Lesson */}
        <section>
          <label htmlFor="lesson">
            <SectionTitle>What should your child learn?</SectionTitle>
          </label>
          <textarea
            id="lesson"
            rows={3}
            maxLength={300}
            value={lesson}
            onChange={(e) => setLesson(e.target.value)}
            placeholder="e.g. simple profit and loss, counting to 10, why we brush our teeth"
            className="w-full rounded-2xl border-4 border-amber-200 bg-white p-4 text-lg text-stone-800 placeholder:text-stone-400 focus:border-orange-400 focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {LESSON_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setLesson(s)}
                className="min-h-12 rounded-full bg-amber-100 px-4 font-medium text-amber-900 transition hover:bg-amber-200 active:scale-95"
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* 3. Hero */}
        <section>
          <SectionTitle>Pick a hero</SectionTitle>
          <div role="radiogroup" aria-label="Pick a hero" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {HERO_CARDS.map((c) => {
              const selected = heroId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setHeroId(c.id)}
                  className={`${choiceClass(selected)} relative flex flex-col items-center justify-center gap-1 p-3`}
                >
                  {selected && (
                    <span className="absolute right-2 top-1 text-lg" aria-hidden>
                      ✅
                    </span>
                  )}
                  <span className="text-5xl" aria-hidden>
                    {c.emoji}
                  </span>
                  <span className="text-center leading-tight">{c.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 4. Age */}
        <section>
          <SectionTitle>How old is your child?</SectionTitle>
          <div role="radiogroup" aria-label="Child's age" className="grid grid-cols-3 gap-3">
            {AGE_GROUPS.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={age === a}
                onClick={() => setAge(a)}
                className={`${choiceClass(age === a)} min-h-16 text-xl`}
              >
                {a}
              </button>
            ))}
          </div>
        </section>

        {/* 5. Language */}
        <section>
          <SectionTitle>Language</SectionTitle>
          <div role="radiogroup" aria-label="Language" className="grid grid-cols-2 gap-3">
            {LANGUAGES.map((l) => (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={language === l}
                onClick={() => setLanguage(l)}
                className={`${choiceClass(language === l)} min-h-14 text-lg`}
              >
                {l}
              </button>
            ))}
          </div>
        </section>

        {/* 6. Make my game */}
        <section className="flex flex-col gap-2">
          <button
            type="button"
            onClick={makeGame}
            disabled={!canSubmit}
            className="min-h-16 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-2xl font-extrabold text-white shadow-lg transition active:scale-95 disabled:cursor-not-allowed disabled:from-stone-300 disabled:to-stone-300 disabled:shadow-none"
          >
            Make my game ✨
          </button>
          {!canSubmit && (
            <p className="text-center text-stone-500">
              Choose a lesson, a hero and an age to continue
            </p>
          )}
        </section>
      </div>
    </>
  );
}
