// Heroes a parent can pick. The `description` is passed to the game
// generator later, so keep it to one line about the character's personality.

export type CharacterGroup = "Mythology" | "Panchatantra" | "Original";

export type Character = {
  id: string;
  name: string;
  emoji: string;
  group: CharacterGroup;
  description: string;
};

export const CHARACTERS: Character[] = [
  {
    id: "hanuman",
    name: "Hanuman",
    emoji: "🐒",
    group: "Mythology",
    description:
      "Strong, loyal and fearless monkey hero who leaps over oceans to help his friends.",
  },
  {
    id: "krishna",
    name: "Krishna",
    emoji: "🪈",
    group: "Mythology",
    description:
      "Playful, mischievous flute-playing cowherd boy who loves butter and solves problems with a smile.",
  },
  {
    id: "ganesha",
    name: "Ganesha",
    emoji: "🐘",
    group: "Mythology",
    description:
      "Gentle, wise elephant-headed god who loves sweets (modaks) and helps clear obstacles.",
  },
  {
    id: "arjuna",
    name: "Arjuna",
    emoji: "🏹",
    group: "Mythology",
    description:
      "Focused, hard-working archer who practises patiently and always aims carefully.",
  },
  {
    id: "clever-monkey",
    name: "Clever Monkey",
    emoji: "🐵",
    group: "Panchatantra",
    description:
      "Quick-thinking monkey who stays calm and uses clever ideas to get out of tricky spots.",
  },
  {
    id: "wise-crow",
    name: "Wise Crow",
    emoji: "🐦‍⬛",
    group: "Panchatantra",
    description:
      "Thoughtful, patient crow who solves problems step by step, like dropping pebbles in a pot.",
  },
  {
    id: "brave-rabbit",
    name: "Brave Rabbit",
    emoji: "🐰",
    group: "Panchatantra",
    description:
      "Small but brave rabbit who proves that smart thinking beats being big and strong.",
  },
  {
    id: "elephant-shopkeeper",
    name: "Elephant Shopkeeper",
    emoji: "🛒",
    group: "Original",
    description:
      "Friendly, honest elephant who runs a village shop and loves counting coins and helping customers.",
  },
  {
    id: "meera",
    name: "Curious Girl Meera",
    emoji: "👧",
    group: "Original",
    description:
      "Cheerful, curious girl who asks 'why?' about everything and loves discovering how things work.",
  },
];

// Special card: resolved to a random real character when the game is made.
export const SURPRISE_ID = "surprise";

export function pickRandomCharacter(): Character {
  return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
}
