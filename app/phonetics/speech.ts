// Browser-only helpers for "Bolu Ya!": text-to-speech, speech recognition
// and Web Audio sound effects. Only call these from event handlers/effects.

// ---------- Text-to-speech ----------

let cachedVoices: SpeechSynthesisVoice[] | null = null;

/** Voices load asynchronously in most browsers; wait for them (max ~2s). */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve([]);
  }
  const synth = window.speechSynthesis;
  const now = synth.getVoices();
  if (now.length) {
    cachedVoices = now;
    return Promise.resolve(now);
  }
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener("voiceschanged", done);
      clearTimeout(timer);
      cachedVoices = synth.getVoices();
      resolve(cachedVoices);
    };
    const timer = setTimeout(done, 2000);
    synth.addEventListener("voiceschanged", done);
  });
}

/** Prefer Marathi, then Hindi (same script), then anything. */
function pickVoice(): { voice: SpeechSynthesisVoice | null; lang: string } {
  const voices = cachedVoices ?? window.speechSynthesis.getVoices();
  const find = (prefix: string) =>
    voices.find((v) => v.lang.replace("_", "-").toLowerCase().startsWith(prefix));
  const marathi = find("mr");
  if (marathi) return { voice: marathi, lang: "mr-IN" };
  const hindi = find("hi");
  if (hindi) return { voice: hindi, lang: "hi-IN" };
  return { voice: null, lang: "mr-IN" };
}

export function voiceLabel(): string {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return "no speech";
  const { voice, lang } = pickVoice();
  return voice ? `${voice.name} (${voice.lang})` : `default voice, lang ${lang}`;
}

/** Speak text; resolves when finished (or after a safety timeout). */
export function speak(text: string, opts: { rate?: number; pitch?: number } = {}): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve();
  const synth = window.speechSynthesis;
  synth.cancel();
  const { voice, lang } = pickVoice();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  if (voice) u.voice = voice;
  u.rate = opts.rate ?? 0.85;
  u.pitch = opts.pitch ?? 1.2;
  return new Promise((resolve) => {
    // onend sometimes never fires (e.g. no voices); don't let the game hang.
    const timer = setTimeout(resolve, 1500 + text.length * 350);
    const finish = () => {
      clearTimeout(timer);
      resolve();
    };
    u.onend = finish;
    u.onerror = finish;
    try {
      synth.speak(u);
    } catch {
      finish();
    }
  });
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

// ---------- Speech recognition ----------

// TypeScript's DOM types don't include SpeechRecognition yet; this is the
// small part of the API we use.
export type Recognizer = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { results: SpeechRecognitionResultList }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechstart: (() => void) | null;
};

type RecognizerCtor = new () => Recognizer;

export function getRecognizerClass(): RecognizerCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognizerCtor;
    webkitSpeechRecognition?: RecognizerCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type ListenOutcome =
  | { kind: "heard"; alternatives: string[] }
  | { kind: "silence" }
  | { kind: "denied" } // mic permission blocked or no microphone
  | { kind: "error"; error: string };

/**
 * Listen once in Marathi. Stops by itself after ~5s with no speech.
 * Returns the recogniser so the caller can abort it.
 */
export function listenOnce(onDone: (outcome: ListenOutcome) => void): Recognizer | null {
  const Ctor = getRecognizerClass();
  if (!Ctor) return null;
  const rec = new Ctor();
  rec.lang = "mr-IN";
  rec.interimResults = false;
  rec.maxAlternatives = 5;
  rec.continuous = false;

  let outcome: ListenOutcome | null = null;
  // No speech within 5s -> stop. Once speech starts, allow up to 8s more.
  let timer = setTimeout(() => rec.stop(), 5000);
  rec.onspeechstart = () => {
    clearTimeout(timer);
    timer = setTimeout(() => rec.stop(), 8000);
  };
  rec.onresult = (e) => {
    const alternatives: string[] = [];
    for (let i = 0; i < e.results.length; i++) {
      const result = e.results[i];
      for (let j = 0; j < result.length; j++) {
        const t = result[j].transcript.trim();
        if (t) alternatives.push(t);
      }
    }
    outcome = alternatives.length ? { kind: "heard", alternatives } : { kind: "silence" };
  };
  rec.onerror = (e) => {
    if (e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture") {
      outcome = { kind: "denied" };
    } else if (e.error === "no-speech" || e.error === "aborted") {
      outcome = outcome ?? { kind: "silence" };
    } else {
      outcome = { kind: "error", error: e.error };
    }
  };
  rec.onend = () => {
    clearTimeout(timer);
    onDone(outcome ?? { kind: "silence" });
  };
  try {
    rec.start();
  } catch {
    clearTimeout(timer);
    onDone({ kind: "error", error: "start-failed" });
    return null;
  }
  return rec;
}

// ---------- Sound effects (Web Audio) ----------

let audioCtx: AudioContext | null = null;

/** Create/resume the AudioContext. Call from the first tap. */
export function unlockAudio() {
  try {
    audioCtx ??= new AudioContext();
    if (audioCtx.state === "suspended") void audioCtx.resume();
  } catch {
    audioCtx = null;
  }
}

function tone(freq: number, start: number, duration: number, type: OscillatorType, volume: number) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  const t = audioCtx.currentTime + start;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

/** Happy rising arpeggio. */
export function playCheer() {
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, i * 0.09, 0.35, "triangle", 0.25));
  tone(1568, 0.5, 0.5, "sine", 0.15);
}

/** Soft, low, gentle two-note tone. */
export function playSoft() {
  tone(330, 0, 0.35, "sine", 0.15);
  tone(262, 0.25, 0.5, "sine", 0.12);
}

/** Small pop when the mic starts. */
export function playPop() {
  tone(880, 0, 0.12, "sine", 0.12);
}
