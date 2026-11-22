import Anthropic from "@anthropic-ai/sdk";
import { CHARACTERS, SURPRISE_ID, pickRandomCharacter } from "@/lib/characters";
import { AGE_GROUPS, LANGUAGES, type GenerateRequest } from "@/lib/gameOptions";
import { GAME_SYSTEM_PROMPT, buildUserMessage } from "@/lib/gamePrompt";

// Generations can take a minute or more; give the route plenty of time.
export const maxDuration = 300;

const MODEL = "claude-sonnet-5-5";
const MAX_TOKENS = 16000;

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

// Remove ```html ... ``` fences if Claude added them anyway.
function stripCodeFences(text: string): string {
  return text
    .trim()
    .replace(/^```[a-zA-Z]*\s*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}

function looksLikeHtml(text: string): boolean {
  const start = text.slice(0, 20).toLowerCase();
  return start.startsWith("<!doctype html") || start.startsWith("<html");
}

export async function POST(request: Request) {
  // 1. Validate input
  let body: Partial<GenerateRequest>;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Something went wrong sending your choices. Please try again.", 400);
  }
  const lesson = typeof body.lesson === "string" ? body.lesson.trim().slice(0, 300) : "";
  const { characterId, age, language } = body;
  if (!lesson) return errorResponse("Please tell us what your child should learn.", 400);
  if (!age || !AGE_GROUPS.includes(age)) return errorResponse("Please pick your child's age.", 400);
  if (!language || !LANGUAGES.includes(language)) return errorResponse("Please pick a language.", 400);

  const character =
    characterId === SURPRISE_ID
      ? pickRandomCharacter()
      : CHARACTERS.find((c) => c.id === characterId);
  if (!character) return errorResponse("Please pick a hero.", 400);

  // 2. API key (server-only; never sent to the browser or logged)
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your-key-here") {
    console.error("[generate] ANTHROPIC_API_KEY is missing or still the placeholder in .env.local");
    return errorResponse(
      "The game maker isn't set up yet: the API key is missing. Add it to .env.local and restart the server.",
      500,
    );
  }

  // 3. Call Claude (streamed on the server to avoid timeouts, collected at the end)
  const client = new Anthropic({ apiKey });
  const started = Date.now();
  let message;
  try {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // Medium effort keeps thinking short so most of the token budget goes to the game.
      output_config: { effort: "medium" },
      // If a safety check declines the request, let the API retry on a fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: GAME_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage({ lesson, character, age, language }) }],
    });
    message = await stream.finalMessage();
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("[generate] Authentication failed: check ANTHROPIC_API_KEY");
      return errorResponse("The game maker's API key isn't working. Please check it and restart the server.", 500);
    }
    if (error instanceof Anthropic.RateLimitError) {
      return errorResponse("Lots of games are being made right now. Please wait a minute and try again.", 429);
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`[generate] Claude API error ${error.status}: ${error.message}`);
      return errorResponse("The game maker had a hiccup. Please try again.", 502);
    }
    console.error("[generate] Unexpected error:", error);
    return errorResponse("We couldn't reach the game maker. Check your internet and try again.", 502);
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `[generate] ${character.name} / ${age} / ${language}: stop=${message.stop_reason}, ` +
      `out_tokens=${message.usage.output_tokens}, ${seconds}s`,
  );

  // 4. Check the result is a usable HTML game
  if (message.stop_reason === "refusal") {
    return errorResponse("We couldn't make a game about that topic. Please try a different lesson.", 422);
  }
  if (message.stop_reason === "max_tokens") {
    return errorResponse("The game came out too big to finish. Please try again.", 502);
  }

  const text = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");
  const html = stripCodeFences(text);
  if (!looksLikeHtml(html)) {
    console.error("[generate] Response was not HTML. Starts with:", html.slice(0, 80));
    return errorResponse("The game didn't come out right this time. Please try again.", 502);
  }

  return Response.json({ html, characterName: character.name, characterEmoji: character.emoji });
}
