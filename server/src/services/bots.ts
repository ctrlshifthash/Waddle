// Ambient bot penguins so rooms never feel empty. Kept deliberately subtle (1-2
// per room) with randomized names/outfits/stats so they read as real players.
import { ITEMS, BELTS } from "../shared";

const FIRST = ["Frosty", "Waddles", "Pingu", "Icy", "Snowy", "Slushy", "Chilly", "Tux", "Pebbles", "Sven", "Cool", "Sir", "Lil", "Captain", "Sneezy", "Glacier", "Aurora", "Mumble", "Berg", "Flippy"];
const SECOND = ["Penguin", "Waddle", "Flipper", "Beak", "Frost", "Puffle", "Wings", "Tux", "Snow", "Pingu", "", "", ""];

function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function ids(slot: string): string[] { return ITEMS.filter((i) => i.slot === slot).map((i) => i.id); }
function maybe(slot: string, p: number): string { return Math.random() < p ? pick(ids(slot)) : ""; }

export interface BotProfile {
  name: string;
  color: string; head: string; face: string; neck: string; body: string; hand: string; feet: string;
  level: number; belt: string; stamps: number; memberSince: number;
}

export function makeBotProfile(): BotProfile {
  const num = Math.random() < 0.5 ? String(Math.floor(Math.random() * 99)) : "";
  return {
    name: `${pick(FIRST)}${pick(SECOND)}${num}`.slice(0, 16) || "Penguin",
    color: pick(ids("color")),
    head: maybe("head", 0.55),
    face: maybe("face", 0.3),
    neck: maybe("neck", 0.3),
    body: maybe("body", 0.4),
    hand: maybe("hand", 0.25),
    feet: maybe("feet", 0.25),
    level: 1 + Math.floor(Math.random() * 34),
    belt: BELTS[Math.floor(Math.random() * Math.random() * BELTS.length)],
    stamps: Math.floor(Math.random() * 13),
    memberSince: Date.now() - Math.floor(1 + Math.random() * 400) * 86400000,
  };
}

export function botName(): string { return makeBotProfile().name; }
