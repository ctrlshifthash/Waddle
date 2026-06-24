// Safe-chat presets and a lightweight profanity filter (Club Penguin was famous
// for kid-safe chat). Free chat still passes through filterText().

export const CHAT_MAX = 80;
export const NAME_MAX = 16;

export const SAFE_CHAT: { id: number; text: string }[] = [
  { id: 0, text: "Hi!" },
  { id: 1, text: "Hello!" },
  { id: 2, text: "Bye!" },
  { id: 3, text: "Cool!" },
  { id: 4, text: "Wanna be friends?" },
  { id: 5, text: "Great job!" },
  { id: 6, text: "Where to?" },
  { id: 7, text: "Let's play!" },
  { id: 8, text: "Follow me!" },
  { id: 9, text: "Nice igloo!" },
  { id: 10, text: "Thanks!" },
  { id: 11, text: "Brrr, it's cold!" },
];

export const EMOTES: { id: number; label: string; glyph: string }[] = [
  { id: 0, label: "Happy", glyph: "😄" },
  { id: 1, label: "Sad", glyph: "😢" },
  { id: 2, label: "Laugh", glyph: "😂" },
  { id: 3, label: "Heart", glyph: "❤️" },
  { id: 4, label: "Surprised", glyph: "😮" },
  { id: 5, label: "Wave", glyph: "👋" },
];

// Minimal block list — expand as needed. Matching is whole-word, case-insensitive.
const BANNED = [
  "damn", "hell", "idiot", "stupid", "hate", "kill", "dumb",
];

const bannedRe = new RegExp(`\\b(${BANNED.join("|")})\\b`, "gi");

/** Sanitize free chat: trim, clamp length, mask banned words. */
export function filterText(input: string): string {
  let s = (input ?? "").replace(/\s+/g, " ").trim().slice(0, CHAT_MAX);
  s = s.replace(bannedRe, (m) => "*".repeat(m.length));
  return s;
}

export function sanitizeName(input: string): string {
  const s = (input ?? "").replace(/[^a-zA-Z0-9 _-]/g, "").trim().slice(0, NAME_MAX);
  return s.length ? s : "Penguin";
}

export function safeChatText(id: number): string | null {
  const e = SAFE_CHAT.find((s) => s.id === id);
  return e ? e.text : null;
}
