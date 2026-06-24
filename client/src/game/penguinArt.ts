// Single source of truth for penguin + item artwork, drawn with the Canvas2D API.
// Used two ways:
//   1) gfx.ts bakes each ITEM_ART entry into a Phaser texture (addCanvas) for the
//      live game world.
//   2) PenguinPreview draws the whole penguin (drawPenguin) for the Closet / Shop /
//      player card so you can SEE your outfit.
// Distinct shapes per item id => a Top Hat actually looks different from a Crown.
import { ITEMS_BY_ID } from "@shared";

type Ctx = CanvasRenderingContext2D;
type Draw = (c: Ctx) => void;
export interface ItemArt { w: number; h: number; draw: Draw; }

function rr(c: Ctx, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
  c.fill();
}
function ell(c: Ctx, x: number, y: number, rx: number, ry: number, fill: string) {
  c.fillStyle = fill; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}
function tri(c: Ctx, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, fill: string) {
  c.fillStyle = fill; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.closePath(); c.fill();
}

export const ITEM_ART: Record<string, ItemArt> = {
  // ---- HEAD ----
  head_beanie: { w: 40, h: 28, draw: (c) => {
    ell(c, 20, 18, 16, 11, "#c0392b");
    c.fillStyle = "#ecf0f1"; rr(c, 4, 20, 32, 6, 3);
    ell(c, 20, 5, 4, 4, "#ecf0f1");
  } },
  head_tophat: { w: 40, h: 32, draw: (c) => {
    ell(c, 20, 28, 18, 5, "#1a1a1a");
    c.fillStyle = "#1a1a1a"; rr(c, 11, 4, 18, 24, 3);
    c.fillStyle = "#c0392b"; c.fillRect(11, 21, 18, 4);
  } },
  head_party: { w: 38, h: 32, draw: (c) => {
    tri(c, 5, 28, 33, 28, 19, 2, "#f1c40f");
    c.strokeStyle = "#e67e22"; c.lineWidth = 2;
    c.beginPath(); c.moveTo(11, 22); c.lineTo(27, 22); c.moveTo(14, 15); c.lineTo(24, 15); c.stroke();
    ell(c, 19, 3, 3, 3, "#e74c3c");
  } },
  head_crown: { w: 40, h: 26, draw: (c) => {
    c.fillStyle = "#f5d142"; c.fillRect(7, 15, 26, 8);
    tri(c, 7, 16, 14, 16, 10, 3, "#f5d142");
    tri(c, 16, 16, 24, 16, 20, 0, "#f5d142");
    tri(c, 26, 16, 33, 16, 30, 3, "#f5d142");
    ell(c, 20, 19, 2.4, 2.4, "#e74c3c");
  } },
  head_propeller: { w: 40, h: 28, draw: (c) => {
    ell(c, 20, 20, 14, 9, "#2980b9");
    c.fillStyle = "#ecf0f1"; rr(c, 6, 8, 28, 3, 1.5); rr(c, 18, 2, 4, 16, 1);
    ell(c, 20, 10, 2.5, 2.5, "#34495e");
  } },
  head_cowboy: { w: 44, h: 26, draw: (c) => {
    ell(c, 22, 19, 21, 5, "#8b5a2b");
    ell(c, 22, 13, 10, 8, "#9c6b3a");
    c.fillStyle = "#5b3a1e"; c.fillRect(12, 17, 20, 3);
  } },
  head_festival: { w: 40, h: 30, draw: (c) => {
    tri(c, 6, 26, 34, 26, 20, 2, "#e84393");
    c.fillStyle = "#ffd43b"; c.beginPath(); c.moveTo(9, 21); c.lineTo(31, 21); c.lineTo(29, 16); c.lineTo(11, 16); c.closePath(); c.fill();
    c.fillStyle = "#34c6c6"; c.beginPath(); c.moveTo(12, 14); c.lineTo(28, 14); c.lineTo(26, 9); c.lineTo(14, 9); c.closePath(); c.fill();
    ell(c, 20, 3, 4, 4, "#ffd43b");
  } },

  // ---- FACE ----
  face_shades: { w: 36, h: 14, draw: (c) => {
    c.fillStyle = "#111"; rr(c, 3, 3, 13, 9, 3); rr(c, 20, 3, 13, 9, 3); c.fillRect(15, 6, 6, 3);
  } },
  face_3d: { w: 36, h: 14, draw: (c) => {
    c.fillStyle = "#e74c3c"; rr(c, 3, 3, 13, 9, 3);
    c.fillStyle = "#3498db"; rr(c, 20, 3, 13, 9, 3);
    c.fillStyle = "#222"; c.fillRect(15, 6, 6, 3);
  } },
  face_eyepatch: { w: 36, h: 16, draw: (c) => {
    c.strokeStyle = "#111"; c.lineWidth = 2; c.beginPath(); c.moveTo(2, 2); c.lineTo(34, 9); c.stroke();
    ell(c, 24, 9, 6, 6, "#111");
  } },

  // ---- NECK ----
  neck_scarf: { w: 40, h: 20, draw: (c) => {
    c.fillStyle = "#27ae60"; rr(c, 2, 2, 36, 8, 4); rr(c, 26, 8, 8, 10, 2);
  } },
  neck_bowtie: { w: 34, h: 16, draw: (c) => {
    tri(c, 4, 3, 4, 13, 17, 8, "#9b59b6");
    tri(c, 30, 3, 30, 13, 17, 8, "#9b59b6");
    c.fillStyle = "#7d3c98"; rr(c, 14, 5, 6, 6, 2);
  } },
  neck_tie: { w: 26, h: 28, draw: (c) => {
    tri(c, 8, 2, 18, 2, 13, 9, "#2c3e50");
    c.fillStyle = "#34495e"; c.beginPath(); c.moveTo(13, 8); c.lineTo(18, 12); c.lineTo(14, 26); c.lineTo(12, 26); c.lineTo(8, 12); c.closePath(); c.fill();
  } },

  // ---- BODY ----
  body_hoodie: { w: 40, h: 34, draw: (c) => {
    c.fillStyle = "#2980b9"; rr(c, 4, 6, 32, 26, 9);
    c.fillStyle = "#2471a3"; rr(c, 12, 2, 16, 9, 5);
    c.strokeStyle = "#1f618d"; c.lineWidth = 2; c.beginPath(); c.moveTo(20, 12); c.lineTo(20, 26); c.stroke();
  } },
  body_tuxedo: { w: 40, h: 34, draw: (c) => {
    c.fillStyle = "#1c2833"; rr(c, 4, 4, 32, 28, 8);
    c.fillStyle = "#fff"; tri(c, 20, 6, 12, 30, 28, 30, "#fff");
    c.fillStyle = "#111"; tri(c, 14, 7, 14, 13, 20, 10, "#111"); tri(c, 26, 7, 26, 13, 20, 10, "#111");
  } },
  body_cape: { w: 46, h: 36, draw: (c) => {
    c.fillStyle = "#c0392b"; c.beginPath(); c.moveTo(8, 4); c.lineTo(38, 4); c.lineTo(44, 34); c.lineTo(2, 34); c.closePath(); c.fill();
    c.fillStyle = "#a93226"; c.fillRect(8, 4, 30, 5);
  } },
  body_raincoat: { w: 40, h: 34, draw: (c) => {
    c.fillStyle = "#f1c40f"; rr(c, 4, 5, 32, 27, 8);
    c.fillStyle = "#d4ac0d"; for (const y of [12, 19, 26]) ell(c, 20, y, 1.6, 1.6, "#d4ac0d");
    c.fillStyle = "#f39c12"; rr(c, 12, 2, 16, 7, 4);
  } },

  // ---- HAND ----
  hand_balloon: { w: 24, h: 42, draw: (c) => {
    c.strokeStyle = "#bbb"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(12, 42); c.lineTo(12, 20); c.stroke();
    ell(c, 12, 11, 9, 11, "#e84393"); tri(c, 10, 20, 14, 20, 12, 24, "#e84393");
  } },
  hand_guitar: { w: 24, h: 36, draw: (c) => {
    c.fillStyle = "#5b3a1e"; rr(c, 14, 2, 4, 22, 2);
    ell(c, 11, 27, 10, 11, "#8e5b2e"); ell(c, 11, 27, 3.5, 3.5, "#3b2410");
  } },
  hand_flag: { w: 24, h: 36, draw: (c) => {
    c.fillStyle = "#7a4a1f"; c.fillRect(9, 2, 3, 32);
    tri(c, 12, 4, 24, 9, 12, 14, "#e74c3c");
  } },
  hand_fishingrod: { w: 26, h: 36, draw: (c) => {
    c.strokeStyle = "#7a4a1f"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(4, 34); c.lineTo(22, 4); c.stroke();
    c.strokeStyle = "#aaa"; c.lineWidth = 1; c.beginPath(); c.moveTo(22, 4); c.lineTo(22, 20); c.stroke();
    ell(c, 22, 22, 2.5, 2.5, "#bdc3c7");
  } },

  // ---- FEET ----
  feet_boots: { w: 40, h: 16, draw: (c) => {
    c.fillStyle = "#6d4c41"; rr(c, 1, 4, 16, 11, 3); rr(c, 23, 4, 16, 11, 3);
    c.fillStyle = "#4e342e"; c.fillRect(1, 12, 16, 3); c.fillRect(23, 12, 16, 3);
  } },
  feet_flippers: { w: 46, h: 16, draw: (c) => {
    ell(c, 11, 9, 11, 6, "#e8772e"); ell(c, 35, 9, 11, 6, "#e8772e");
  } },
};

// Igloo furniture art — same Canvas2D system as clothing, one recognizable shape
// per furniture id (sized to the catalog's w/h). Baked into Phaser textures by
// gfx.ts for the world, and drawn by drawItemIcon() for the shop/editor.
export const FURNITURE_ART: Record<string, ItemArt> = {
  f_chair: { w: 40, h: 48, draw: (c) => {
    c.fillStyle = "#7a3e22"; c.fillRect(9, 30, 4, 16); c.fillRect(27, 30, 4, 16);
    c.fillStyle = "#a0522d"; rr(c, 9, 4, 22, 26, 5);
    c.fillStyle = "#bd6b3e"; rr(c, 6, 26, 28, 8, 3);
  } },
  f_table: { w: 80, h: 56, draw: (c) => {
    c.fillStyle = "#6d451f"; c.fillRect(12, 22, 7, 32); c.fillRect(61, 22, 7, 32);
    c.fillStyle = "#8b5a2b"; rr(c, 4, 14, 72, 12, 5);
    c.fillStyle = "#a06a36"; c.fillRect(8, 15, 64, 3);
  } },
  f_plant: { w: 44, h: 64, draw: (c) => {
    c.fillStyle = "#b5651d"; c.beginPath(); c.moveTo(13, 42); c.lineTo(31, 42); c.lineTo(28, 62); c.lineTo(16, 62); c.closePath(); c.fill();
    c.fillStyle = "#caa472"; c.fillRect(12, 42, 20, 4);
    ell(c, 22, 24, 16, 19, "#2e7d32"); ell(c, 13, 20, 8, 12, "#388e3c"); ell(c, 31, 20, 8, 12, "#388e3c"); ell(c, 22, 11, 7, 11, "#43a047");
  } },
  f_tv: { w: 90, h: 60, draw: (c) => {
    c.fillStyle = "#1a1f24"; rr(c, 4, 4, 82, 44, 5);
    c.fillStyle = "#5da9e0"; rr(c, 9, 9, 72, 34, 3);
    tri(c, 12, 41, 34, 12, 50, 41, "#7fc4f0");
    c.fillStyle = "#263238"; c.fillRect(38, 48, 14, 5); rr(c, 28, 53, 34, 4, 2);
  } },
  f_sofa: { w: 120, h: 60, draw: (c) => {
    c.fillStyle = "#c2185b"; rr(c, 4, 10, 112, 34, 10);
    c.fillStyle = "#a3144d"; rr(c, 4, 26, 14, 28, 7); rr(c, 102, 26, 14, 28, 7);
    c.fillStyle = "#e0457f"; rr(c, 22, 30, 36, 18, 6); rr(c, 62, 30, 36, 18, 6);
  } },
  f_rug: { w: 140, h: 90, draw: (c) => {
    ell(c, 70, 45, 66, 40, "#5e35b1"); ell(c, 70, 45, 52, 30, "#7e57c2"); ell(c, 70, 45, 30, 17, "#b39ddb");
  } },
  f_lamp: { w: 36, h: 80, draw: (c) => {
    c.fillStyle = "#7a6a3a"; c.fillRect(16, 24, 4, 50);
    c.fillStyle = "#5a4a26"; rr(c, 8, 72, 20, 6, 3);
    c.fillStyle = "#fdd835"; c.beginPath(); c.moveTo(6, 24); c.lineTo(30, 24); c.lineTo(25, 4); c.lineTo(11, 4); c.closePath(); c.fill();
    c.fillStyle = "#fff3b0"; c.fillRect(11, 22, 14, 3);
  } },
  f_speaker: { w: 50, h: 70, draw: (c) => {
    c.fillStyle = "#37474f"; rr(c, 6, 4, 38, 62, 5);
    ell(c, 25, 22, 12, 12, "#222"); ell(c, 25, 22, 6, 6, "#455a64");
    ell(c, 25, 48, 8, 8, "#222"); ell(c, 25, 48, 4, 4, "#455a64");
  } },
  f_bookshelf: { w: 90, h: 96, draw: (c) => {
    c.fillStyle = "#6d4c41"; rr(c, 6, 4, 78, 88, 4);
    c.fillStyle = "#4e342e"; c.fillRect(12, 30, 66, 4); c.fillRect(12, 58, 66, 4);
    const books = ["#c0392b", "#27ae60", "#2980b9", "#f1c40f", "#8e44ad", "#e67e22"];
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) { c.fillStyle = books[(i + r) % 6]; c.fillRect(13 + i * 11, 9 + r * 28, 9, 19); }
  } },
  f_bed: { w: 140, h: 70, draw: (c) => {
    c.fillStyle = "#4a4f7a"; rr(c, 4, 20, 132, 44, 6);
    c.fillStyle = "#5c6bc0"; rr(c, 8, 26, 124, 30, 5);
    c.fillStyle = "#fff"; rr(c, 12, 22, 36, 20, 6);
    c.fillStyle = "#3949ab"; rr(c, 56, 30, 72, 22, 5);
  } },
  f_fishtank: { w: 90, h: 70, draw: (c) => {
    c.fillStyle = "#5a4a3a"; rr(c, 4, 4, 82, 6, 2); rr(c, 4, 58, 82, 8, 2);
    c.fillStyle = "#26c6da"; rr(c, 7, 10, 76, 48, 2);
    c.fillStyle = "#80deea"; c.fillRect(10, 12, 70, 5);
    ell(c, 40, 34, 8, 5, "#ff8a3d"); tri(c, 48, 34, 56, 28, 56, 40, "#ff8a3d");
    ell(c, 38, 33, 1.4, 1.4, "#11313a");
    c.fillStyle = "#2e7d32"; for (const x of [18, 66]) { c.beginPath(); c.moveTo(x, 56); c.lineTo(x - 3, 40); c.lineTo(x + 3, 40); c.closePath(); c.fill(); }
  } },
  f_fireplace: { w: 110, h: 90, draw: (c) => {
    c.fillStyle = "#8d6e63"; rr(c, 4, 4, 102, 82, 4);
    c.fillStyle = "#6d4c41"; for (let r = 0; r < 5; r++) for (let i = 0; i < 6; i++) { c.fillRect(8 + i * 16 + (r % 2 ? 8 : 0), 8 + r * 15, 14, 12); }
    c.fillStyle = "#1a1a1a"; rr(c, 30, 34, 50, 48, 4);
    c.fillStyle = "#7a4a1f"; c.fillRect(36, 70, 38, 6);
    tri(c, 44, 70, 55, 46, 66, 70, "#e67e22");
    tri(c, 50, 70, 55, 56, 60, 70, "#f1c40f");
  } },
  f_piano: { w: 120, h: 80, draw: (c) => {
    c.fillStyle = "#212121"; rr(c, 8, 10, 104, 60, 6);
    c.fillStyle = "#111"; rr(c, 8, 10, 104, 16, 6);
    c.fillStyle = "#fff"; rr(c, 16, 44, 88, 22, 2);
    c.fillStyle = "#111"; for (let i = 0; i < 10; i++) c.fillRect(22 + i * 8.6, 44, 4, 13);
  } },
};

// slot center offsets (relative to the penguin's feet point), in base px
const SLOT_OFF: Record<string, { x: number; y: number }> = {
  body: { x: 0, y: -27 }, feet: { x: 0, y: -3 }, neck: { x: 0, y: -15 },
  face: { x: 0, y: -45 }, head: { x: 0, y: -59 }, hand: { x: 17, y: -26 },
};

export interface OutfitLike {
  color: string; head: string; face: string; neck: string; body: string; hand: string; feet: string;
}

function drawItem(c: Ctx, id: string, cx: number, cy: number, s: number) {
  const art = ITEM_ART[id];
  if (!art) return;
  c.save();
  c.translate(cx - (art.w / 2) * s, cy - (art.h / 2) * s);
  c.scale(s, s);
  art.draw(c);
  c.restore();
}

/** Draw a full penguin centered horizontally at cx with feet at baseline cy. */
export function drawPenguin(c: Ctx, cx: number, cy: number, s: number, outfit: OutfitLike, puffleColor?: string) {
  const bodyColor = ITEMS_BY_ID[outfit.color]?.tint ?? "#2e6fdb";
  // shadow
  ell(c, cx, cy + 2 * s, 20 * s, 6 * s, "rgba(0,0,0,0.18)");
  // default feet (orange), unless a feet item covers them
  if (!outfit.feet) { ell(c, cx - 9 * s, cy - 5 * s, 7 * s, 4 * s, "#e8772e"); ell(c, cx + 9 * s, cy - 5 * s, 7 * s, 4 * s, "#e8772e"); }
  // body
  c.lineWidth = 2 * s; c.strokeStyle = "#16202b";
  c.beginPath(); c.ellipse(cx, cy - 30 * s, 23 * s, 27 * s, 0, 0, Math.PI * 2); c.fillStyle = bodyColor; c.fill(); c.stroke();
  // belly
  ell(c, cx, cy - 24 * s, 13 * s, 16 * s, "#eef4fb");
  if (outfit.body) drawItem(c, outfit.body, cx + SLOT_OFF.body.x * s, cy + SLOT_OFF.body.y * s, s);
  if (outfit.feet) drawItem(c, outfit.feet, cx + SLOT_OFF.feet.x * s, cy + SLOT_OFF.feet.y * s, s);
  // beak + eyes
  tri(c, cx - 6 * s, cy - 39 * s, cx + 6 * s, cy - 39 * s, cx, cy - 31 * s, "#f5a623");
  ell(c, cx - 7 * s, cy - 46 * s, 4 * s, 5 * s, "#fff");
  ell(c, cx + 7 * s, cy - 46 * s, 4 * s, 5 * s, "#fff");
  ell(c, cx - 6 * s, cy - 45 * s, 2 * s, 2.4 * s, "#222831");
  ell(c, cx + 8 * s, cy - 45 * s, 2 * s, 2.4 * s, "#222831");
  if (outfit.neck) drawItem(c, outfit.neck, cx + SLOT_OFF.neck.x * s, cy + SLOT_OFF.neck.y * s, s);
  if (outfit.face) drawItem(c, outfit.face, cx + SLOT_OFF.face.x * s, cy + SLOT_OFF.face.y * s, s);
  if (outfit.head) drawItem(c, outfit.head, cx + SLOT_OFF.head.x * s, cy + SLOT_OFF.head.y * s, s);
  if (outfit.hand) drawItem(c, outfit.hand, cx + SLOT_OFF.hand.x * s, cy + SLOT_OFF.hand.y * s, s);
  if (puffleColor) { ell(c, cx - 30 * s, cy - 6 * s, 9 * s, 8 * s, puffleColor); ell(c, cx - 33 * s, cy - 8 * s, 1.6 * s, 1.6 * s, "#222"); }
}

/** Draw a square shop/closet icon for any item id: the real clothing or furniture
 *  art, or — for body-colour items, which have no shape — a mini penguin of that
 *  colour. `size` is the canvas square in CSS px (caller handles DPR). */
export function drawItemIcon(c: Ctx, id: string, size: number) {
  c.clearRect(0, 0, size, size);
  const art = ITEM_ART[id] ?? FURNITURE_ART[id];
  if (art) {
    const pad = size * 0.14;
    const s = Math.min((size - pad * 2) / art.w, (size - pad * 2) / art.h);
    c.save();
    c.translate(size / 2 - (art.w * s) / 2, size / 2 - (art.h * s) / 2);
    c.scale(s, s);
    art.draw(c);
    c.restore();
    return;
  }
  // body-colour item (or unknown) -> a little penguin wearing that colour
  if (ITEMS_BY_ID[id]) drawPenguin(c, size / 2, size * 0.84, size / 92, { color: id, head: "", face: "", neck: "", body: "", hand: "", feet: "" });
}
