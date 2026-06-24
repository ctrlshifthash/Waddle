// Island layout + world helpers.
//
// A "world" is an independent copy of the whole island (Disney ran many server
// copies). The Colyseus matchmaking key is `area = "<worldId>@<roomId>"`, so
// players in the same world + room share an instance. roomId is one of ROOMS,
// or "igloo:<ownerKey>". Igloo *contents* are stored per player (global), so
// your igloo looks the same in every world.

export const WORLD_W = 1066; // 16:9 so it fills standard widescreens edge-to-edge
export const WORLD_H = 600;

export const DEFAULT_WORLD = "main";
export const DEFAULT_ROOM = "town";

export function makeArea(worldId: string, roomId: string): string {
  return `${worldId || DEFAULT_WORLD}@${roomId}`;
}
export function parseArea(area: string): { worldId: string; roomId: string } {
  const i = (area || "").indexOf("@");
  if (i < 0) return { worldId: DEFAULT_WORLD, roomId: area || DEFAULT_ROOM };
  return { worldId: area.slice(0, i) || DEFAULT_WORLD, roomId: area.slice(i + 1) || DEFAULT_ROOM };
}
export function normalizeWorldId(input: string): string {
  const s = (input || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 20);
  return s || DEFAULT_WORLD;
}

export interface DoorDef {
  x: number;
  y: number;
  w: number;
  h: number;
  toRoom: string;
  label: string;
}

export type FeatureType = "shop" | "minigame" | "igloo_entry" | "petshop";

export interface FeatureDef {
  type: FeatureType;
  x: number;
  y: number;
  label: string;
  id?: string; // shop id / minigame id
}

/** Visual theme drives the procedural scenery drawn in the Phaser scene. */
export type RoomTheme = "snow" | "interior" | "water" | "night" | "forest" | "stage";

export interface RoomDef {
  id: string;
  name: string;
  bg: string;
  sky?: string;
  theme: RoomTheme;
  spawn: { x: number; y: number };
  bounds: { x: number; y: number; w: number; h: number };
  doors: DoorDef[];
  features: FeatureDef[];
  /** Full room size. Outdoor rooms are larger than the 1066x600 viewport and the
   *  camera scrolls/follows the player; defaults to the viewport when omitted. */
  w?: number;
  h?: number;
  /** Shown on the Map menu. */
  mapHint?: string;
}

export const roomW = (def: RoomDef) => def.w ?? WORLD_W;
export const roomH = (def: RoomDef) => def.h ?? WORLD_H;

// interior rooms: single 1066x600 screen
const walk = { x: 40, y: 250, w: WORLD_W - 80, h: WORLD_H - 290 };
const door = (x: number, toRoom: string, label: string): DoorDef => ({ x, y: 150, w: 130, h: 96, toRoom, label });

// outdoor rooms: a snow world shown zoomed-out to fit (16:9, fills the viewport).
// Roomy on purpose so the forest frames a wide-open play area instead of crowding it.
const OUT_W = 1920, OUT_H = 1080;
const outWalk = { x: 70, y: 180, w: OUT_W - 140, h: OUT_H - 240 };
const outSpawn = { x: OUT_W / 2, y: OUT_H - 200 };
const od = (cx: number, toRoom: string, label: string): DoorDef => ({ x: cx - 65, y: 96, w: 130, h: 96, toRoom, label });
const X3 = [OUT_W * 0.2, OUT_W * 0.5, OUT_W * 0.8];
const X2 = [OUT_W * 0.32, OUT_W * 0.68];

export const ROOMS: Record<string, RoomDef> = {
  town: {
    id: "town", name: "Town", theme: "snow", bg: "#dfe5e8", sky: "#dfe5e8",
    w: OUT_W, h: OUT_H, spawn: outSpawn, bounds: outWalk,
    doors: [
      od(X3[0], "coffee", "Coffee Shop"),
      od(X3[1], "nightclub", "Night Club"),
      od(X3[2], "plaza", "Plaza"),
    ],
    features: [{ type: "igloo_entry", x: OUT_W / 2, y: Math.round(OUT_H * 0.46), label: "My Igloo" }],
    mapHint: "Main hub",
  },
  coffee: {
    id: "coffee", name: "Coffee Shop", theme: "interior", bg: "#7a5230", sky: "#5d4037",
    spawn: { x: 140, y: WORLD_H - 120 }, bounds: walk,
    doors: [door(WORLD_W / 2 - 65, "town", "Town")],
    features: [{ type: "shop", x: WORLD_W - 230, y: 320, label: "Clothing Shop", id: "clothing" }],
    mapHint: "Buy clothing",
  },
  nightclub: {
    id: "nightclub", name: "Night Club", theme: "night", bg: "#2a1f4d", sky: "#160f30",
    spawn: { x: WORLD_W / 2, y: WORLD_H - 120 }, bounds: walk,
    doors: [door(70, "town", "Town"), door(WORLD_W - 200, "plaza", "Plaza")],
    features: [{ type: "minigame", x: WORLD_W / 2, y: 340, label: "Astro Barrier", id: "astrobarrier" }],
    mapHint: "Astro Barrier",
  },
  plaza: {
    id: "plaza", name: "Plaza", theme: "snow", bg: "#e2e8ea", sky: "#e2e8ea",
    w: OUT_W, h: OUT_H, spawn: outSpawn, bounds: outWalk,
    doors: [
      od(X3[0], "town", "Town"),
      od(X3[1], "pizza", "Pizza Parlor"),
      od(X3[2], "petshop", "Pet Shop"),
    ],
    features: [],
    mapHint: "Crossroads",
  },
  pizza: {
    id: "pizza", name: "Pizza Parlor", theme: "interior", bg: "#9c3b2e", sky: "#7a2d22",
    spawn: { x: WORLD_W / 2, y: WORLD_H - 120 }, bounds: walk,
    doors: [door(WORLD_W / 2 - 65, "plaza", "Plaza")],
    features: [
      { type: "minigame", x: 240, y: 340, label: "Bean Counters", id: "beancounters" },
      { type: "minigame", x: WORLD_W - 240, y: 340, label: "Pizzatron 3000", id: "pizzatron" },
    ],
    mapHint: "Bean Counters & Pizzatron",
  },
  petshop: {
    id: "petshop", name: "Pet Shop", theme: "interior", bg: "#5a7d3a", sky: "#456030",
    spawn: { x: 140, y: WORLD_H - 120 }, bounds: walk,
    doors: [door(WORLD_W / 2 - 65, "plaza", "Plaza")],
    features: [
      { type: "petshop", x: 250, y: 330, label: "Adopt a Puffle", id: "puffle" },
      { type: "minigame", x: WORLD_W - 230, y: 330, label: "Puffle Roundup", id: "puffleroundup" },
    ],
    mapHint: "Puffles & Roundup",
  },
  dock: {
    id: "dock", name: "Dock", theme: "water", bg: "#dfeaf7", sky: "#dfeaf7",
    w: OUT_W, h: OUT_H, spawn: outSpawn, bounds: outWalk,
    doors: [od(X2[0], "town", "Town"), od(X2[1], "beach", "Beach")],
    features: [
      { type: "minigame", x: Math.round(OUT_W * 0.28), y: Math.round(OUT_H * 0.55), label: "Coin Dash", id: "coindash" },
      { type: "minigame", x: Math.round(OUT_W * 0.72), y: Math.round(OUT_H * 0.68), label: "Ice Fishing", id: "icefishing" },
    ],
    mapHint: "Coin Dash & Ice Fishing",
  },
  beach: {
    id: "beach", name: "Beach", theme: "water", bg: "#eef0d8", sky: "#eef0d8",
    w: OUT_W, h: OUT_H, spawn: outSpawn, bounds: outWalk,
    doors: [od(X3[1], "dock", "Dock")],
    features: [
      { type: "minigame", x: Math.round(OUT_W * 0.28), y: Math.round(OUT_H * 0.55), label: "Jet Pack Adventure", id: "jetpack" },
      { type: "minigame", x: Math.round(OUT_W * 0.72), y: Math.round(OUT_H * 0.55), label: "Hydro Hopper", id: "hydrohopper" },
    ],
    mapHint: "Jet Pack & Hydro Hopper",
  },
  forts: {
    id: "forts", name: "Snow Forts", theme: "snow", bg: "#e6edf0", sky: "#e6edf0",
    w: OUT_W, h: OUT_H, spawn: outSpawn, bounds: outWalk,
    doors: [
      od(X3[0], "town", "Town"),
      od(X3[1], "dojo", "Dojo"),
      od(X3[2], "ski", "Ski Village"),
    ],
    features: [],
    mapHint: "Snowball fights",
  },
  dojo: {
    id: "dojo", name: "Dojo", theme: "interior", bg: "#3d2a4f", sky: "#2a1d38",
    spawn: { x: WORLD_W / 2, y: WORLD_H - 120 }, bounds: walk,
    doors: [door(WORLD_W / 2 - 65, "forts", "Snow Forts")],
    features: [{ type: "minigame", x: WORLD_W / 2, y: 330, label: "Card-Jitsu", id: "cardjitsu" }],
    mapHint: "Card-Jitsu & belts",
  },
  ski: {
    id: "ski", name: "Ski Village", theme: "snow", bg: "#e6edf0", sky: "#e6edf0",
    w: OUT_W, h: OUT_H, spawn: outSpawn, bounds: outWalk,
    doors: [od(X2[0], "forts", "Snow Forts")],
    features: [{ type: "minigame", x: Math.round(OUT_W * 0.72), y: Math.round(OUT_H * 0.5), label: "Cart Surfer", id: "cartsurfer" }],
    mapHint: "Cart Surfer",
  },
};

/** Order shown on the Map menu. */
export const MAP_ORDER = [
  "town", "coffee", "nightclub", "plaza", "pizza", "petshop", "dock", "beach", "forts", "dojo", "ski",
];

// ---- Igloos ---------------------------------------------------------------
export function iglooRoomId(ownerKey: string): string {
  return `igloo:${ownerKey}`;
}
export function isIglooRoom(roomId: string): boolean {
  return roomId.startsWith("igloo:");
}
export function iglooOwnerKey(roomId: string): string {
  return roomId.slice("igloo:".length);
}

export const IGLOO_DEF: Omit<RoomDef, "id"> = {
  name: "Igloo", theme: "interior", bg: "#8fa6c4", sky: "#cfd8dc",
  spawn: { x: WORLD_W / 2, y: WORLD_H - 120 },
  bounds: { x: 60, y: 230, w: WORLD_W - 120, h: WORLD_H - 270 },
  doors: [],
  features: [],
};
