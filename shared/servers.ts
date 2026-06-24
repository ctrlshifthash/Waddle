// Named servers (à la Club Penguin) shown on the server-select screen. Each one
// is an independent world; live player counts come from the /worlds endpoint.

export interface GameServer {
  id: string;
  name: string;
}

export const SERVERS: GameServer[] = [
  { id: "blizzard", name: "Blizzard" },
  { id: "frozen", name: "Frozen" },
  { id: "snowday", name: "Snow Day" },
  { id: "iceberg", name: "Iceberg" },
  { id: "aurora", name: "Aurora" },
  { id: "frostbite", name: "Frostbite" },
  { id: "slushy", name: "Slushy" },
  { id: "alpine", name: "Alpine" },
  { id: "glacier", name: "Glacier" },
  { id: "northpole", name: "North Pole" },
  { id: "tundra", name: "Tundra" },
  { id: "iceshelf", name: "Ice Shelf" },
];

export const SERVER_CAPACITY = 50;

export type PopulationLevel = "low" | "medium" | "high" | "full";

export function populationLevel(count: number): { label: string; pct: number; level: PopulationLevel } {
  const pct = Math.min(100, Math.round((count / SERVER_CAPACITY) * 100));
  if (count >= SERVER_CAPACITY) return { label: "Full", pct: 100, level: "full" };
  if (pct >= 70) return { label: "Packed", pct, level: "high" };
  if (pct >= 35) return { label: "Busy", pct, level: "medium" };
  return { label: count > 0 ? "Open" : "Quiet", pct: Math.max(pct, 6), level: "low" };
}
