// Puffles = adoptable pets. The active puffle follows your penguin and is visible
// to everyone in the room. Colours are placeholder tints (swap for sprites later).

export interface PuffleType {
  id: string;
  name: string;
  color: string;
  price: number;
}

export const PUFFLE_TYPES: PuffleType[] = [
  { id: "blue", name: "Blue Puffle", color: "#3a78d6", price: 400 },
  { id: "red", name: "Red Puffle", color: "#e23b3b", price: 400 },
  { id: "green", name: "Green Puffle", color: "#3fae54", price: 400 },
  { id: "pink", name: "Pink Puffle", color: "#ef79b3", price: 500 },
  { id: "purple", name: "Purple Puffle", color: "#8a4fd6", price: 600 },
  { id: "yellow", name: "Yellow Puffle", color: "#ecc63b", price: 600 },
  { id: "black", name: "Black Puffle", color: "#2b2b30", price: 800 },
];

export const PUFFLE_BY_ID: Record<string, PuffleType> = Object.fromEntries(
  PUFFLE_TYPES.map((p) => [p.id, p]),
);

export const MAX_PUFFLES = 8;
