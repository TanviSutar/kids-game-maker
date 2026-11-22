"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PHONETICS_WORDS } from "@/lib/phoneticsWords";
import { matchTranscripts, type MatchResult } from "@/lib/phoneticsMatch";
import {
  getRecognizerClass,
  listenOnce,
  loadVoices,
  playCheer,
  playPop,
  playSoft,
  speak,
  stopSpeaking,
  unlockAudio,
  voiceLabel,
  type ListenOutcome,
  type Recognizer,
} from "./speech";
import s from "./bolu-ya.module.css";

const WORDS = PHONETICS_WORDS;
const MAX_ATTEMPTS = 3;
const AUTO_ADVANCE_MS = 2500;

const SAY = {
  tryAgain: "पुन्हा प्रयत्न करूया",
  notHeard: "मला ऐकू आलं नाही, पुन्हा बोल",
  praise: ["छान!", "शाब्बास!"],
  end: "तू खूप हुशार आहेस!",
};

type Screen = "start" | "round" | "end";
type Status =
  | "speaking" // game is saying the word
  | "ready" // waiting for the child
  | "listening"
  | "notHeard" // silence: not counted as wrong
  | "wrong"
  | "correct"
  | "movingOn"; // 3 wrong tries: gentle move on
type WordResult = "correct" | "practised" | "skipped" | null;
type MicMode = "mic" | "listenOnly";
type MonkeyMood = "wave" | "idle" | "happy" | "sad";
type Piece = { id: number; left: number; delay: number; duration: number; drift: number; spin: number; content: string; color: string; size: number };

const CONFETTI_COLORS = ["#f97316", "#ec4899", "#facc15", "#22c55e", "#3b82f6", "#a855f7"];
const CONFETTI_EMOJI = ["⭐", "🎉", "✨", "🌸", "🍌"];

function makeConfetti(count: number): Piece[] {
  return Array.from({ length: count }, (_, id) => {
    const emoji = Math.random() < 0.3;
    return {
      id,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 2.2 + Math.random() * 1.6,
      drift: (Math.random() - 0.5) * 160,
      spin: (Math.random() - 0.5) * 1080,
      content: emoji ? CONFETTI_EMOJI[Math.floor(Math.random() * CONFETTI_EMOJI.length)] : "",
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: emoji ? 22 + Math.random() * 14 : 8 + Math.random() * 8,
    };
  });
}

function Confetti({ pieces }: { pieces: Piece[] }) {
  return (
    <div className={s.confettiLayer} aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className={s.confetti}
          style={
            {
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              "--drift": `${p.drift}px`,
              "--spin": `${p.spin}deg`,
              fontSize: p.size,
              ...(p.content
                ? {}
                : { width: p.size, height: p.size * 0.6, background: p.color, borderRadius: 3 }),
            } as CSSProperties
          }
        >
          {p.content}
        </span>
      ))}
    </div>
  );
}

function Monkey({ mood, size = "text-8xl" }: { mood: MonkeyMood; size?: string }) {
  const cls = { wave: s.wave, idle: s.idle, happy: s.dance, sad: s.sad }[mood];
  return (
    <span className={`relative inline-block ${size}`} role="img" aria-label={`Clever Monkey (${mood})`}>
      <span className={cls}>{mood === "wave" ? "🐵👋" : "🐵"}</span>
      {mood === "sad" && (
        <>
          <span className={`${s.tear} text-[0.3em]`}>💧</span>
          <span className="absolute -right-6 -top-2 text-[0.4em]">😢</span>
        </>
      )}
    </span>
  );
}

function Bubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-12 rounded-3xl bg-white px-5 py-3 text-center text-xl font-bold text-stone-800 shadow-md">
      {children}
    </div>
  );
}

export default function BoluYaGame({ fontClass }: { fontClass: string }) {
  const [screen, setScreen] = useState<Screen>("start");
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<Status>("speaking");
  const [results, setResults] = useState<WordResult[]>(() => WORDS.map(() => null));
  const [micMode, setMicMode] = useState<MicMode>("mic");
  const [micBlocked, setMicBlocked] = useState(false);
  const [confetti, setConfetti] = useState<Piece[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [debugOn, setDebugOn] = useState(false);
  const [debug, setDebug] = useState<{ voice: string; heard: string[]; match: MatchResult | null; note: string }>({
    voice: "",
    heard: [],
    match: null,
    note: "",
  });

  // Refs for values read inside async callbacks (avoid stale closures).
  const indexRef = useRef(0);
  const attemptsRef = useRef(0);
  const tokenRef = useRef(0); // bumps on every round change; stale async work checks it
  const recRef = useRef<Recognizer | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleTapsRef = useRef<number[]>([]);

  const word = WORDS[index];

  useEffect(() => {
    return () => {
      recRef.current?.abort();
      stopSpeaking();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }

  function stopListening() {
    recRef.current?.abort();
    recRef.current = null;
  }

  // Hidden debug toggle: tap the title 5 times within 3 seconds.
  function onTitleTap() {
    const now = Date.now();
    titleTapsRef.current = [...titleTapsRef.current.filter((t) => now - t < 3000), now];
    if (titleTapsRef.current.length >= 5) {
      titleTapsRef.current = [];
      setDebugOn((on) => !on);
      setDebug((d) => ({ ...d, voice: voiceLabel() }));
    }
  }

  async function sayWord(token: number) {
    await speak(WORDS[indexRef.current].word, { rate: 0.7, pitch: 1.25 });
    return token === tokenRef.current;
  }

  async function goToRound(i: number) {
    clearTimer();
    stopListening();
    const token = ++tokenRef.current;
    indexRef.current = i;
    attemptsRef.current = 0;
    setAttempts(0);
    setIndex(i);
    setConfetti([]);
    setScreen("round");
    setStatus("speaking");
    if (await sayWord(token)) setStatus("ready");
  }

  async function start() {
    unlockAudio(); // must happen inside the tap
    await loadVoices();
    setDebug((d) => ({ ...d, voice: voiceLabel() }));
    setMicMode(getRecognizerClass() ? "mic" : "listenOnly");
    setResults(WORDS.map(() => null));
    void goToRound(0);
  }

  function finishGame() {
    clearTimer();
    stopListening();
    tokenRef.current++;
    setScreen("end");
    setConfetti(makeConfetti(70));
    playCheer();
    void speak(SAY.end, { rate: 0.85, pitch: 1.25 });
  }

  function next() {
    const i = indexRef.current;
    if (i + 1 < WORDS.length) void goToRound(i + 1);
    else finishGame();
  }

  function setResult(i: number, r: WordResult) {
    setResults((prev) => prev.map((old, j) => (j === i ? r : old)));
  }

  async function onCorrect() {
    const token = tokenRef.current;
    setResult(indexRef.current, "correct");
    setStatus("correct");
    setConfetti(makeConfetti(60));
    playCheer();
    const praise = SAY.praise[Math.floor(Math.random() * SAY.praise.length)];
    await speak(praise, { rate: 0.9, pitch: 1.3 });
    if (token !== tokenRef.current) return;
    timerRef.current = setTimeout(next, AUTO_ADVANCE_MS);
  }

  async function onWrong() {
    const token = tokenRef.current;
    attemptsRef.current += 1;
    setAttempts(attemptsRef.current);
    playSoft();
    if (attemptsRef.current >= MAX_ATTEMPTS) {
      setResult(indexRef.current, "practised");
      setStatus("movingOn");
      if (!(await sayWord(token))) return;
      timerRef.current = setTimeout(next, AUTO_ADVANCE_MS + 1000);
      return;
    }
    setStatus("wrong");
    await speak(SAY.tryAgain, { rate: 0.85, pitch: 1.2 });
    if (token !== tokenRef.current) return;
    await sayWord(token);
  }

  async function onNotHeard() {
    setStatus("notHeard");
    await speak(SAY.notHeard, { rate: 0.85, pitch: 1.2 });
  }

  function handleOutcome(outcome: ListenOutcome, token: number) {
    recRef.current = null;
    if (token !== tokenRef.current) return;
    if (outcome.kind === "heard") {
      const match = matchTranscripts(outcome.alternatives, WORDS[indexRef.current]);
      setDebug((d) => ({ ...d, heard: outcome.alternatives, match, note: "" }));
      if (match.matched) void onCorrect();
      else void onWrong();
    } else if (outcome.kind === "denied") {
      setDebug((d) => ({ ...d, note: "mic blocked" }));
      setMicBlocked(true);
      setStatus("ready");
    } else {
      setDebug((d) => ({
        ...d,
        heard: [],
        match: null,
        note: outcome.kind === "error" ? `error: ${outcome.error}` : "silence",
      }));
      void onNotHeard();
    }
  }

  function listen() {
    clearTimer();
    stopSpeaking();
    playPop();
    const token = tokenRef.current;
    setStatus("listening");
    const rec: Recognizer | null = listenOnce((outcome) => {
      if (recRef.current !== rec) return; // cancelled (skip, replay, next round)
      handleOutcome(outcome, token);
    });
    if (!rec) {
      if (!getRecognizerClass()) setMicMode("listenOnly");
      setStatus("ready");
      return;
    }
    recRef.current = rec;
  }

  function replay() {
    if (status === "listening") {
      stopListening();
      setStatus("ready");
    }
    void sayWord(tokenRef.current);
  }

  function skip() {
    if (results[indexRef.current] === null) setResult(indexRef.current, "skipped");
    stopSpeaking();
    next();
  }

  function playAgain() {
    setResults(WORDS.map(() => null));
    void goToRound(0);
  }

  // ---------- Screens ----------

  const title = (
    <button type="button" onClick={onTitleTap} className="font-extrabold" aria-label="Bolu Ya">
      बोलू या!
    </button>
  );

  const debugPanel = debugOn && (
    <div className="fixed inset-x-2 bottom-2 z-[60] max-h-[40dvh] overflow-auto rounded-xl bg-black/80 p-3 font-mono text-xs text-green-200">
      <div>
        voice: {debug.voice || "?"} · recogniser: {getRecognizerClass() ? "yes" : "no"} · mode: {micMode} · status: {status} · tries: {attempts}
      </div>
      <div>target: {word.word} ({word.romanised})</div>
      <div>heard: {debug.heard.length ? debug.heard.map((h) => `“${h}”`).join(", ") : debug.note || "—"}</div>
      {debug.match?.best && (
        <div>
          best: “{debug.match.best.heard}” vs “{debug.match.best.against}” · distance {debug.match.best.distance} ·{" "}
          {debug.match.matched ? "✅ match" : "❌ no match"}
        </div>
      )}
    </div>
  );

  if (screen === "start") {
    return (
      <main className={`${fontClass} flex min-h-dvh flex-col items-center justify-center gap-8 bg-gradient-to-b from-amber-200 via-orange-200 to-pink-200 p-6 text-center`}>
        <Monkey mood="wave" size="text-9xl" />
        <h1 className="text-6xl text-orange-700 drop-shadow-sm">{title}</h1>
        <p className="text-xl font-semibold text-stone-700">Say the animal! 🐯 🐘 🐒 🐱 🐿️</p>
        <button
          type="button"
          onClick={start}
          className={`${s.pop} min-h-24 w-full max-w-xs rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-3xl font-extrabold text-white shadow-xl active:scale-95`}
        >
          Tap to start ▶️
        </button>
        <Link href="/" className="min-h-12 px-4 py-3 font-semibold text-stone-600 underline">
          ← Home
        </Link>
        {debugPanel}
      </main>
    );
  }

  if (screen === "end") {
    return (
      <main className={`${fontClass} relative flex min-h-dvh flex-col items-center justify-center gap-6 overflow-hidden bg-gradient-to-b from-yellow-200 via-orange-200 to-pink-300 p-6 text-center`}>
        <Confetti pieces={confetti} />
        <Monkey mood="happy" size="text-9xl" />
        <Bubble>{SAY.end}</Bubble>
        <div className="flex gap-2" aria-label="Your words">
          {WORDS.map((w, i) => (
            <div key={w.id} className="flex w-14 flex-col items-center rounded-2xl bg-white/70 py-2 shadow">
              <span className="text-4xl">{w.emoji}</span>
              <span className={`text-2xl ${results[i] === "correct" ? s.starSpin : "opacity-25 grayscale"}`} style={{ animationDelay: `${i * 0.15}s` }}>
                ⭐
              </span>
            </div>
          ))}
        </div>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <button
            type="button"
            onClick={playAgain}
            className="min-h-20 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-2xl font-extrabold text-white shadow-xl active:scale-95"
          >
            Play again 🔁
          </button>
          <Link
            href="/"
            className="flex min-h-16 items-center justify-center rounded-full bg-white text-xl font-bold text-stone-700 shadow active:scale-95"
          >
            Home 🏠
          </Link>
        </div>
        {debugPanel}
      </main>
    );
  }

  // Round screen
  const mood: MonkeyMood =
    status === "wrong" ? "sad" : status === "correct" ? "happy" : status === "speaking" ? "wave" : "idle";
  const bubble =
    status === "listening" ? "Listening… 👂"
    : status === "wrong" ? `${SAY.tryAgain} 💛`
    : status === "notHeard" ? SAY.notHeard
    : status === "movingOn" ? "Great try! Let's go to the next one 💪"
    : status === "speaking" ? "🔊 …"
    : "Your turn! 🎤";
  const canAct = status !== "correct" && status !== "movingOn";

  return (
    <main className={`${fontClass} relative flex min-h-dvh flex-col bg-gradient-to-b from-amber-100 via-orange-100 to-pink-100 px-4 pb-6 pt-3`}>
      {/* Top bar */}
      <div className="flex items-center justify-between text-2xl text-orange-700">
        {title}
        <div className="flex gap-1" aria-label={`Word ${index + 1} of ${WORDS.length}`}>
          {WORDS.map((w, i) => (
            <span
              key={w.id}
              className={`h-3 w-3 rounded-full ${
                results[i] === "correct" ? "bg-yellow-400" : i === index ? "bg-orange-500" : results[i] ? "bg-orange-300" : "bg-white"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={skip}
          className="min-h-12 rounded-full px-3 text-sm font-semibold text-stone-500 active:scale-95"
        >
          Skip ⏭️
        </button>
      </div>

      {/* Monkey + message */}
      <div className="mt-2 flex flex-col items-center gap-2">
        <Monkey mood={mood} size="text-7xl" />
        <Bubble>{bubble}</Bubble>
      </div>

      {/* Word card */}
      <div key={word.id} className={`${s.pop} mx-auto mt-4 flex w-full max-w-sm flex-col items-center rounded-[2rem] bg-white/80 px-4 py-5 shadow-lg`}>
        <span className="text-[6.5rem] leading-none" aria-hidden>
          {word.emoji}
        </span>
        <span lang="mr" className="mt-2 text-6xl font-extrabold text-stone-800">
          {word.word}
        </span>
        <span className="mt-1 font-sans text-lg text-stone-500">{word.romanised}</span>
      </div>

      {/* Controls */}
      <div className="mt-auto flex items-end justify-center gap-6 pt-6">
        <button
          type="button"
          onClick={replay}
          aria-label="Hear the word again"
          className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-4xl shadow-lg active:scale-95"
        >
          🔊
        </button>

        {micMode === "mic" ? (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={status === "listening" ? () => recRef.current?.stop() : listen}
              disabled={!canAct}
              aria-label={status === "listening" ? "Listening" : "Your turn: say the word"}
              className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-orange-500 text-5xl text-white shadow-xl active:scale-95 disabled:opacity-40"
            >
              {status === "listening" && (
                <>
                  <span className={s.micPulse} />
                  <span className={`${s.micPulse} ${s.micPulse2}`} />
                </>
              )}
              <span className="relative">🎤</span>
            </button>
            <span className="font-bold text-stone-700">{status === "listening" ? "Listening…" : "Your turn!"}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => void onCorrect()}
                disabled={!canAct}
                aria-label="They said it"
                className="flex h-24 w-24 items-center justify-center rounded-full bg-green-500 text-5xl shadow-xl active:scale-95 disabled:opacity-40"
              >
                ✅
              </button>
              <button
                type="button"
                onClick={() => void onWrong()}
                disabled={!canAct}
                aria-label="Try again"
                className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-400 text-5xl shadow-xl active:scale-95 disabled:opacity-40"
              >
                🔁
              </button>
            </div>
            <span className="max-w-[16rem] text-center text-sm text-stone-600">
              Parent: tap ✅ when your child says it. For the mic, please open this in Chrome.
            </span>
          </div>
        )}
      </div>

      {/* Moving on after 3 tries */}
      {status === "movingOn" && (
        <button
          type="button"
          onClick={next}
          className="mx-auto mt-4 min-h-16 w-full max-w-xs rounded-full bg-orange-500 text-2xl font-bold text-white shadow-lg active:scale-95"
        >
          Next ➡️
        </button>
      )}

      {/* Correct: full-screen party */}
      {status === "correct" && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 overflow-hidden bg-gradient-to-b from-yellow-200/95 via-orange-200/95 to-pink-300/95 p-6 text-center">
          <Confetti pieces={confetti} />
          <div className="flex items-end gap-2">
            <Monkey mood="happy" size="text-8xl" />
            <span className={`${s.pop} text-8xl`}>{word.emoji}</span>
          </div>
          <div className="text-5xl" aria-label="Three stars">
            {[0, 1, 2].map((i) => (
              <span key={i} className={s.starSpin} style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
                ⭐
              </span>
            ))}
          </div>
          <p lang="mr" className={`${s.pop} text-5xl font-extrabold text-orange-700`}>
            {word.word}! 🎉
          </p>
          <button
            type="button"
            onClick={next}
            className="relative min-h-20 w-full max-w-xs rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-3xl font-extrabold text-white shadow-xl active:scale-95"
          >
            Next ➡️
          </button>
        </div>
      )}

      {/* Mic blocked */}
      {micBlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="text-6xl">🎤🙈</div>
            <h2 className="mt-2 text-2xl font-bold text-stone-800">The mic is turned off</h2>
            <p className="mt-2 text-stone-600">
              To let the monkey hear your child: tap the 🔒 or ⓘ icon next to the web address, set{" "}
              <b>Microphone</b> to <b>Allow</b>, then tap the 🎤 again. (Some browsers need a page reload.)
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setMicBlocked(false)}
                className="min-h-14 rounded-full bg-orange-500 text-xl font-bold text-white active:scale-95"
              >
                OK, try again
              </button>
              <button
                type="button"
                onClick={() => {
                  setMicBlocked(false);
                  setMicMode("listenOnly");
                }}
                className="min-h-12 rounded-full font-semibold text-stone-600 underline"
              >
                Play without the mic
              </button>
            </div>
          </div>
        </div>
      )}

      {debugPanel}
    </main>
  );
}
