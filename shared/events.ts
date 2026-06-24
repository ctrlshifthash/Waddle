// Parties / seasonal events. While an event is active, rooms get festive decor,
// a banner shows, and players can claim a free limited-time item + coin bonus.
// Swap ACTIVE_EVENT (or set it to null) to change/disable the current party.

export interface GameEventDef {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  accent: string;       // banner/decor accent colour
  freeItemId: string;   // limited item granted on claim
  freeItemName: string;
  coins: number;        // bonus coins on claim
}

export const ACTIVE_EVENT: GameEventDef | null = {
  id: "winter_fiesta",
  name: "Winter Fiesta",
  emoji: "🎉",
  tagline: "The island is celebrating! Claim your free Festival Hat and a coin bonus.",
  accent: "#e84393",
  freeItemId: "head_festival",
  freeItemName: "Festival Hat",
  coins: 100,
};

export function getActiveEvent(): GameEventDef | null {
  return ACTIVE_EVENT;
}
