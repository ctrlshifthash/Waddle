// Item & furniture catalogs. Visuals here are placeholder colors/shapes so the
// game is fully playable now; drop real sprites in later by mapping item.id ->
// a texture key in client/src/assets/manifest.ts (the catalog itself won't change).

export type ClothingSlot =
  | "color" // the penguin body color
  | "head"  // hats / hair
  | "face"  // glasses / masks
  | "neck"  // scarves / necklaces
  | "body"  // shirts / jackets
  | "hand"  // held items
  | "feet"; // shoes

export const CLOTHING_SLOTS: ClothingSlot[] = [
  "color", "head", "face", "neck", "body", "hand", "feet",
];

export interface Item {
  id: string;
  name: string;
  slot: ClothingSlot;
  price: number;
  /** Penguin body tint for `color` items, accessory tint for everything else. */
  tint: string;
  /** Given to every new player for free. */
  free?: boolean;
  /** Limited event item — not sold in the shop, only claimable during a party. */
  event?: boolean;
}

// --- Body colors (slot: "color") -------------------------------------------
const COLORS: Item[] = [
  { id: "color_blue",   name: "Blue",   slot: "color", price: 0,   tint: "#2e6fdb", free: true },
  { id: "color_red",    name: "Red",    slot: "color", price: 20,  tint: "#d63a3a" },
  { id: "color_green",  name: "Green",  slot: "color", price: 20,  tint: "#3aa84a" },
  { id: "color_pink",   name: "Pink",   slot: "color", price: 20,  tint: "#e86fb0" },
  { id: "color_black",  name: "Black",  slot: "color", price: 40,  tint: "#2b2b30" },
  { id: "color_yellow", name: "Yellow", slot: "color", price: 40,  tint: "#e8c63a" },
  { id: "color_purple", name: "Purple", slot: "color", price: 60,  tint: "#8a4fd6" },
  { id: "color_aqua",   name: "Aqua",   slot: "color", price: 60,  tint: "#34c6c6" },
  { id: "color_white",  name: "White",  slot: "color", price: 40,  tint: "#eef4fb" },
  { id: "color_orange", name: "Orange", slot: "color", price: 40,  tint: "#e8772e" },
  { id: "color_teal",   name: "Teal",   slot: "color", price: 60,  tint: "#2bb6a8" },
  { id: "color_lime",   name: "Lime",   slot: "color", price: 60,  tint: "#8bd146" },
];

// --- Clothing --------------------------------------------------------------
const CLOTHES: Item[] = [
  { id: "head_beanie",  name: "Toque",        slot: "head", price: 50,  tint: "#c0392b" },
  { id: "head_tophat",  name: "Top Hat",      slot: "head", price: 150, tint: "#1a1a1a" },
  { id: "head_party",   name: "Party Hat",    slot: "head", price: 250, tint: "#f1c40f" },
  { id: "head_crown",   name: "Crown",        slot: "head", price: 800, tint: "#f5d142" },
  { id: "face_shades",  name: "Sunglasses",   slot: "face", price: 80,  tint: "#111111" },
  { id: "face_3d",      name: "3D Glasses",   slot: "face", price: 120, tint: "#e74c3c" },
  { id: "neck_scarf",   name: "Scarf",        slot: "neck", price: 60,  tint: "#27ae60" },
  { id: "neck_bowtie",  name: "Bow Tie",      slot: "neck", price: 70,  tint: "#9b59b6" },
  { id: "body_hoodie",  name: "Hoodie",       slot: "body", price: 100, tint: "#2980b9" },
  { id: "body_tuxedo",  name: "Tuxedo",       slot: "body", price: 300, tint: "#2c3e50" },
  { id: "hand_balloon", name: "Balloon",      slot: "hand", price: 90,  tint: "#e84393" },
  { id: "hand_guitar",  name: "Guitar",       slot: "hand", price: 220, tint: "#8e5b2e" },
  { id: "feet_boots",   name: "Snow Boots",   slot: "feet", price: 75,  tint: "#6d4c41" },
  // expanded set (each has distinct in-game art)
  { id: "head_propeller", name: "Propeller Cap", slot: "head", price: 120, tint: "#2980b9" },
  { id: "head_cowboy",    name: "Cowboy Hat",    slot: "head", price: 180, tint: "#8b5a2b" },
  { id: "face_eyepatch",  name: "Eye Patch",     slot: "face", price: 90,  tint: "#111111" },
  { id: "neck_tie",       name: "Necktie",       slot: "neck", price: 80,  tint: "#2c3e50" },
  { id: "body_raincoat",  name: "Raincoat",      slot: "body", price: 140, tint: "#f1c40f" },
  { id: "body_cape",      name: "Hero Cape",     slot: "body", price: 260, tint: "#c0392b" },
  { id: "hand_flag",      name: "Flag",          slot: "hand", price: 70,  tint: "#e74c3c" },
  { id: "hand_fishingrod", name: "Fishing Rod",  slot: "hand", price: 110, tint: "#7a4a1f" },
  { id: "feet_flippers",  name: "Flippers",      slot: "feet", price: 85,  tint: "#e8772e" },
  // limited event items (claimed during parties, never sold)
  { id: "head_festival",  name: "Festival Hat",  slot: "head", price: 0, tint: "#e84393", event: true },
];

export const ITEMS: Item[] = [...COLORS, ...CLOTHES];

export const ITEMS_BY_ID: Record<string, Item> = Object.fromEntries(
  ITEMS.map((i) => [i.id, i]),
);

/** Items every new penguin starts owning. */
export const STARTER_ITEMS: string[] = ITEMS.filter((i) => i.free).map((i) => i.id);

export const DEFAULT_OUTFIT = {
  color: "color_blue",
  head: "",
  face: "",
  neck: "",
  body: "",
  hand: "",
  feet: "",
} as const;

// --- Igloo furniture -------------------------------------------------------
export interface Furniture {
  id: string;
  name: string;
  price: number;
  w: number;
  h: number;
  color: string;
}

export const FURNITURE: Furniture[] = [
  { id: "f_chair",   name: "Chair",        price: 40,  w: 40, h: 48, color: "#a0522d" },
  { id: "f_table",   name: "Table",        price: 60,  w: 80, h: 56, color: "#8b5a2b" },
  { id: "f_plant",   name: "Plant",        price: 50,  w: 44, h: 64, color: "#2e7d32" },
  { id: "f_tv",      name: "TV",           price: 200, w: 90, h: 60, color: "#263238" },
  { id: "f_sofa",    name: "Sofa",         price: 180, w: 120, h: 60, color: "#c2185b" },
  { id: "f_rug",     name: "Rug",          price: 70,  w: 140, h: 90, color: "#5e35b1" },
  { id: "f_lamp",    name: "Lamp",         price: 55,  w: 36, h: 80, color: "#fdd835" },
  { id: "f_speaker", name: "Speaker",      price: 130, w: 50, h: 70, color: "#37474f" },
  { id: "f_bookshelf", name: "Bookshelf",  price: 150, w: 90, h: 96, color: "#6d4c41" },
  { id: "f_bed",     name: "Bed",          price: 220, w: 140, h: 70, color: "#5c6bc0" },
  { id: "f_fishtank", name: "Fish Tank",   price: 170, w: 90, h: 70, color: "#26c6da" },
  { id: "f_fireplace", name: "Fireplace",  price: 240, w: 110, h: 90, color: "#8d6e63" },
  { id: "f_piano",   name: "Piano",        price: 320, w: 120, h: 80, color: "#212121" },
];

export const FURNITURE_BY_ID: Record<string, Furniture> = Object.fromEntries(
  FURNITURE.map((f) => [f.id, f]),
);
