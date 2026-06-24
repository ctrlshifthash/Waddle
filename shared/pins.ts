// Collectible pins hidden around the island (a classic CP collectible). One pin
// hides in a room at a fixed spot; click it to collect (once) for coins. Shown
// on your Stamp Book + player card.

export interface Pin {
  id: string;
  name: string;
  icon: string;
  room: string; // roomId where it hides
  x: number;
  y: number;
  coins: number;
}

export const PINS: Pin[] = [
  { id: "pin_balloon", name: "Balloon Pin", icon: "🎈", room: "town", x: 770, y: 440, coins: 30 },
  { id: "pin_anchor", name: "Anchor Pin", icon: "⚓", room: "dock", x: 120, y: 470, coins: 30 },
  { id: "pin_shell", name: "Seashell Pin", icon: "🐚", room: "beach", x: 640, y: 470, coins: 30 },
  { id: "pin_music", name: "Music Note Pin", icon: "🎵", room: "nightclub", x: 770, y: 450, coins: 40 },
  { id: "pin_pizza", name: "Pizza Pin", icon: "🍕", room: "pizza", x: 150, y: 470, coins: 40 },
  { id: "pin_snow", name: "Snowflake Pin", icon: "❄️", room: "forts", x: 700, y: 470, coins: 30 },
  { id: "pin_flame", name: "Flame Pin", icon: "🔥", room: "dojo", x: 770, y: 480, coins: 50 },
  { id: "pin_star", name: "Star Pin", icon: "⭐", room: "plaza", x: 720, y: 470, coins: 40 },
];

export const PINS_BY_ID: Record<string, Pin> = Object.fromEntries(PINS.map((p) => [p.id, p]));
export const TOTAL_PINS = PINS.length;

export function pinsInRoom(roomId: string): Pin[] {
  return PINS.filter((p) => p.room === roomId);
}
