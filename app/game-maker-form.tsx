"use client";

import { useState } from "react";
import {
  CHARACTERS,
  SURPRISE_ID,
  pickRandomCharacter,
  type Character,
} from "@/lib/characters";

const LESSON_SUGGESTIONS = [
  "Counting to 10",
  "Colours",
  "Profit and loss",
  "Sharing with friends",
  "Healthy food",
];

const AGE_GROUPS = ["2–3", "4–5", "6–8"] as const;
const LANGUAGES = ["English", "Hindi"] as const;

type AgeGroup = (typeof AGE_GROUPS)[number];
type Language = (typeof LANGUAGES)[number];

type GameRequest = {
  lesson: string;
  character: Character;
  wasSurprise: boolean;
  age: AgeGroup;
  language: Language;
};

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

export default function GameMakerForm() {
  const [lesson, setLesson] = useState("");
  const [heroId, setHeroId] = useState<string | null>(null);
  const [age, setAge] = useState<AgeGroup | null>(null);
  const [language, setLanguage] = useState<Language>("English");
  const [request, setRequest] = useState<GameRequest | null>(null);

  const canSubmit = lesson.trim() !== "" && heroId !== null && age !== null;

  function handleMakeGame() {
    if (!lesson.trim() || !heroId || !age) return;
    const wasSurprise = heroId === SURPRISE_ID;
    const character = wasSurprise
      ? pickRandomCharacter()
      : CHARACTERS.find((c) => c.id === heroId)!;
    setRequest({ lesson: lesson.trim(), character, wasSurprise, age, language });
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-6">
      {/* 1. Header */}
      <header className="rounded-3xl bg-gradient-to-br from-orange-400 to-pink-500 px-5 py-6 text-center text-white shadow-lg">
        <h1 className="text-3xl font-extrabold">🎮 Kids Game Maker</h1>
        <p className="mt-2 text-lg">Turn any lesson into a 3-minute game</p>
      </header>

      {/* 2. Lesson */}
      <section>
        <label htmlFor="lesson">
          <SectionTitle>What should your child learn?</SectionTitle>
        </label>
        <textarea
          id="lesson"
          rows={3}
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
          {[...CHARACTERS, { id: SURPRISE_ID, name: "Surprise me", emoji: "🎲" }].map(
            (c) => {
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
            },
          )}
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
          onClick={handleMakeGame}
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

      {request && (
        <section className="rounded-3xl border-4 border-green-300 bg-green-50 p-5 text-stone-800 shadow-md">
          <h2 className="mb-3 text-xl font-bold">Your game will be about…</h2>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-lg">
            <dt className="font-semibold">Lesson</dt>
            <dd>{request.lesson}</dd>
            <dt className="font-semibold">Hero</dt>
            <dd>
              {request.character.emoji} {request.character.name}
              {request.wasSurprise && " (surprise!)"}
            </dd>
            <dt className="font-semibold">Age</dt>
            <dd>{request.age}</dd>
            <dt className="font-semibold">Language</dt>
            <dd>{request.language}</dd>
          </dl>
        </section>
      )}
    </div>
  );
}
