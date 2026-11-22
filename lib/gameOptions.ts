// Choices shared by the form (browser) and the API route (server).

export const AGE_GROUPS = ["2–3", "4–5", "6–8"] as const;
export const LANGUAGES = ["English", "Hindi"] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];
export type Language = (typeof LANGUAGES)[number];

export type GenerateRequest = {
  lesson: string;
  characterId: string;
  age: AgeGroup;
  language: Language;
};
