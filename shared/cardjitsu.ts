// Card-Jitsu: the classic CP card battle. Elements beat each other rock-paper-
// scissors style; same element -> higher value wins. Win the match by collecting
// 3 cards of the same element OR one of each of the three elements.

export type Element = "fire" | "water" | "snow";
export const ELEMENTS: Element[] = ["fire", "water", "snow"];

export const ELEMENT_ICON: Record<Element, string> = { fire: "🔥", water: "💧", snow: "❄️" };
export const ELEMENT_COLOR: Record<Element, string> = { fire: "#e2522f", water: "#2f8fe2", snow: "#7fd1ff" };

/** Does element a beat element b? fire>snow, snow>water, water>fire. */
export function beats(a: Element, b: Element): boolean {
  return (
    (a === "fire" && b === "snow") ||
    (a === "snow" && b === "water") ||
    (a === "water" && b === "fire")
  );
}

export interface Card {
  id: number;
  element: Element;
  value: number; // 2..10
}

/** Win when the pile has 3 of one element, or one of each element. */
export function hasWinningSet(pile: Card[]): boolean {
  const c = { fire: 0, water: 0, snow: 0 };
  for (const card of pile) c[card.element]++;
  if (c.fire >= 1 && c.water >= 1 && c.snow >= 1) return true;
  return c.fire >= 3 || c.water >= 3 || c.snow >= 3;
}

// --- Belt progression ------------------------------------------------------
export const BELTS = [
  "White", "Yellow", "Orange", "Green", "Blue", "Red", "Purple", "Brown", "Black", "Ninja",
];
export const WINS_PER_BELT = 2;
export const CARDJITSU_WIN_COINS = 35;

export function beltForWins(wins: number): { index: number; name: string } {
  const index = Math.min(BELTS.length - 1, Math.floor(Math.max(0, wins) / WINS_PER_BELT));
  return { index, name: BELTS[index] };
}
