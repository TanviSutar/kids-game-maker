# Kids Game Maker

## Project goal
A prototype web app. Parents type a topic they want their young child (ages 2–8) to learn and pick a theme (e.g. Indian mythology, animals). The app calls the Claude API to generate a small, one-time playable game as a **single self-contained HTML file**, which is then shown on screen. Games are played once and discarded (no saving or storage needed).

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- `@anthropic-ai/sdk` for Claude API calls
- Start dev server: `npm run dev` → http://localhost:3000
- Phone testing over HTTPS (needed for the mic): `npm run dev:https` → prints the https://<mac-ip>:3000 URL
- Unit tests: `npm test` (Node's built-in test runner, `lib/*.test.ts`)

## Routes
- `/`: parent input screen; generates a game with Claude (`app/api/generate`, prompt in `lib/gamePrompt.ts`)
- `/phonetics`: **currently hidden** (`SHOW_PHONETICS = false` in `lib/features.ts`; route 404s, no home card). Hand-coded showcase "Bolu Ya!" (Marathi animal words; speech in/out, no Claude API). Words in `lib/phoneticsWords.ts`, matching in `lib/phoneticsMatch.ts`. Tap the title 5 times for the recogniser debug panel.

## Standing rules
- **Mobile-first design**: big, thumb-friendly controls.
- **The Anthropic API key is server-only**: read `ANTHROPIC_API_KEY` only in server code (API route handlers / server code). Never use it in, or pass it to, browser/client components. Never prefix it with `NEXT_PUBLIC_`.
- **Keep the code simple**: this is a prototype, not production.
- `.env.local` holds the API key and must never be committed.

@AGENTS.md
