// ============================================================================
// Tile-based room rendering. Builds each room from the imported pixel-art
// tilesets (forest-winter outdoor + bitglow LRK interior) instead of the old
// procedural Graphics scenery. Frames are sub-rectangles registered on each
// loaded sheet; rooms are composed by tiling a floor/ground + placing props.
// Everything is drawn crisp (pixelArt) and scaled up 3x from the 16px source.
// ============================================================================
import Phaser from "phaser";
import { WORLD_W, WORLD_H, roomW, roomH, type RoomDef } from "@shared";

const T = 16; // source tile size
export const PX = 3; // display scale (16px -> 48px)

export const TILESETS = {
  winter: { key: "ts_winter", path: "/sprites/tilesets/winter/tiles.png" },
  fw: { key: "ts_fw", path: "/sprites/tilesets/interior/floorswalls_LRK.png" },
  kit: { key: "ts_kit", path: "/sprites/tilesets/interior/kitchen_LRK.png" },
  liv: { key: "ts_liv", path: "/sprites/tilesets/interior/livingroom_LRK.png" },
  dec: { key: "ts_dec", path: "/sprites/tilesets/interior/decorations_LRK.png" },
  dor: { key: "ts_dor", path: "/sprites/tilesets/interior/doorswindowsstairs_LRK.png" },
} as const;
type TsName = keyof typeof TILESETS;

// ---- interior frames: [tileset, col, row, widthTiles, heightTiles] (clean 16px grid) ----
const IFRAMES: Record<string, [TsName, number, number, number, number]> = {
  // floors (1x1, tiled)
  fl_wood: ["fw", 2, 6, 1, 1], fl_stone: ["fw", 6, 6, 1, 1], fl_dark: ["fw", 10, 6, 1, 1],
  fl_beige: ["fw", 2, 13, 1, 1], fl_grey: ["fw", 6, 13, 1, 1], fl_charcoal: ["fw", 10, 13, 1, 1],
  // walls (1x1, tiled band)
  wl_cream: ["fw", 1, 1, 1, 1], wl_teal: ["fw", 5, 1, 1, 1], wl_white: ["fw", 9, 1, 1, 1],
  wl_pink: ["fw", 1, 10, 1, 1], wl_green: ["fw", 5, 10, 1, 1], wl_grey: ["fw", 9, 10, 1, 1],
  // kitchen furniture
  counter: ["kit", 1, 5, 8, 3], stove: ["kit", 12, 5, 2, 3], oven: ["kit", 15, 5, 2, 3],
  sink: ["kit", 18, 5, 2, 2], fridge: ["kit", 22, 1, 3, 4], fridge2: ["kit", 22, 11, 3, 4],
  upcab: ["kit", 12, 1, 4, 2],
  // living room furniture
  sofa: ["liv", 1, 1, 3, 3], sofa_grey: ["liv", 1, 5, 3, 3], armchair: ["liv", 8, 1, 2, 3],
  fireplace: ["liv", 30, 1, 2, 4], rtable: ["liv", 13, 13, 2, 2], desk: ["liv", 1, 9, 2, 3],
  chair: ["liv", 9, 9, 1, 2], rug: ["liv", 1, 16, 4, 4], rug_red: ["liv", 1, 21, 4, 4],
  rug_round: ["liv", 26, 16, 3, 4], tv: ["liv", 21, 21, 3, 2], standlamp: ["liv", 17, 22, 1, 3],
  // decorations
  dlamp: ["dec", 1, 1, 1, 3], plant: ["dec", 1, 5, 1, 2], plant2: ["dec", 5, 5, 1, 2],
  painting: ["dec", 7, 6, 2, 1], mirror: ["dec", 10, 4, 1, 3], clock: ["dec", 1, 8, 1, 1],
  vase: ["dec", 3, 8, 1, 1],
  // doors / windows
  window: ["dor", 13, 1, 2, 3], idoor: ["dor", 7, 1, 2, 4],
};

// ---- winter outdoor frames: EXACT pixel boxes [x, y, w, h] on tiles.png. The
// winter forest sheet is NOT on a tile grid — sprites sit at arbitrary offsets —
// so every box below was machine-measured from the sheet's alpha channel
// (connected-components) to be a COMPLETE sprite: full foliage + trunk, transparent
// background, no neighbour bleed and no clipped edges. ----
const WFRAMES: Record<string, [number, number, number, number]> = {
  // decorated + plain firs (each self-contained, with its little trunk)
  w_pine: [451, 12, 41, 52], w_pine2: [499, 12, 41, 52],
  w_tree: [196, 16, 41, 64], w_treemed: [244, 16, 41, 64],
  // big snow-dome trees (full canopy + trunk) — six variants for a varied forest
  w_bigtree: [435, 75, 92, 117], w_bigtree2: [194, 86, 92, 107],
  w_bigtree3: [336, 36, 96, 156], w_bigtree4: [359, 209, 73, 143],
  w_bigtree5: [272, 180, 70, 108], w_bigtree6: [340, 360, 88, 88],
  // bare / dead snowy trees + a stump + bare saplings/brambles
  w_dead: [98, 72, 62, 72], w_dead2: [135, 193, 57, 79], w_bramble: [205, 216, 67, 72],
  w_stump: [549, 151, 39, 41], w_sapling: [160, 29, 32, 51], w_twig: [160, 109, 32, 35],
  // snowy bushes (eight shapes/sizes)
  w_bush: [288, 119, 44, 57], w_bush2: [434, 194, 44, 45], w_bushbig: [531, 68, 70, 76],
  w_bush3: [193, 288, 46, 48], w_bush4: [482, 198, 57, 58], w_bush5: [270, 291, 65, 56],
  w_bush6: [289, 71, 45, 41],
  // small props
  w_log: [81, 17, 69, 38], w_snowman: [299, 33, 39, 32], w_rock: [240, 290, 32, 46],
  w_rock2: [289, 353, 31, 28],
  // frozen ponds (own transparent bg) + open-water fill tile (tiled)
  w_pond: [226, 385, 45, 47], w_pond2: [176, 385, 48, 47], w_water: [480, 384, 16, 16],
  // ground decals (laid flat, low depth, to texture the open snow)
  w_snowpatch: [5, 180, 70, 87], w_drift: [52, 449, 74, 75], w_drift2: [132, 449, 74, 75],
  w_fade: [212, 449, 74, 75],
  // big feature pieces: a stone retaining-wall + waterfall, and a cave mouth
  w_wall: [309, 448, 203, 110], w_cave: [256, 528, 48, 46],
  // dirt path: a single clean centre tile reused for all 9 autotile slots — the
  // sheet has no 9-slice path set, so a uniform packed-dirt trail reads cleanest.
  p_tl: [80, 368, 16, 16], p_t: [80, 368, 16, 16], p_tr: [80, 368, 16, 16],
  p_l: [80, 368, 16, 16], p_c: [80, 368, 16, 16], p_r: [80, 368, 16, 16],
  p_bl: [80, 368, 16, 16], p_b: [80, 368, 16, 16], p_br: [80, 368, 16, 16],
};

// unified frame table, normalised to source-pixel units: [tileset, x, y, w, h]
const FRAMES: Record<string, [TsName, number, number, number, number]> = {};
for (const [n, [ts, c, r, w, h]] of Object.entries(IFRAMES)) FRAMES[n] = [ts, c * T, r * T, w * T, h * T];
for (const [n, [x, y, w, h]] of Object.entries(WFRAMES)) FRAMES[n] = ["winter", x, y, w, h];

export const texKey = (frame: string) => TILESETS[FRAMES[frame][0]].key;

export function loadTilesets(scene: Phaser.Scene) {
  for (const t of Object.values(TILESETS)) if (!scene.textures.exists(t.key)) scene.load.image(t.key, t.path);
  if (!scene.textures.exists("ts_waterfall"))
    scene.load.spritesheet("ts_waterfall", "/sprites/tilesets/winter/waterfall.png", { frameWidth: 32, frameHeight: 48 });
}

export function registerFrames(scene: Phaser.Scene) {
  for (const [name, [ts, x, y, w, h]] of Object.entries(FRAMES)) {
    const tex = scene.textures.get(TILESETS[ts].key);
    if (!tex || tex.has(name)) continue;
    tex.add(name, 0, x, y, w, h);
  }
  if (!scene.anims.exists("waterfall"))
    scene.anims.create({
      key: "waterfall",
      frames: scene.anims.generateFrameNumbers("ts_waterfall", { start: 0, end: 5 }),
      frameRate: 8, repeat: -1,
    });
}

/** Place a tile/prop image. (x,y) is the BASE point (bottom-centre by default). */
export function tImg(scene: Phaser.Scene, frame: string, x: number, y: number, s = PX, originY = 1) {
  return scene.add.image(x, y, texKey(frame), frame).setOrigin(0.5, originY).setScale(s);
}

export interface Item { f: string; x: number; y: number; s?: number; depth?: number; flip?: boolean; }
export interface InteriorCfg { floor: string; wall: string; windows?: number[]; items: Item[]; }

/** Build an indoor room: tiled floor + wall band + furniture. Returns objects for cleanup. */
export function buildInterior(scene: Phaser.Scene, top: number, cfg: InteriorCfg): Phaser.GameObjects.GameObject[] {
  const objs: Phaser.GameObjects.GameObject[] = [];
  const fh = WORLD_H - top;
  const floor = scene.add.tileSprite(WORLD_W / 2, top + fh / 2, WORLD_W, fh, texKey(cfg.floor), cfg.floor).setDepth(-1000);
  floor.tileScaleX = floor.tileScaleY = PX; objs.push(floor);
  const wall = scene.add.tileSprite(WORLD_W / 2, top / 2, WORLD_W, top, texKey(cfg.wall), cfg.wall).setDepth(-1002);
  wall.tileScaleX = wall.tileScaleY = PX; objs.push(wall);
  // floor/wall junction shadow
  const g = scene.add.graphics().setDepth(-1001);
  g.fillStyle(0x000000, 0.22); g.fillRect(0, top - 5, WORLD_W, 8);
  g.fillStyle(0xffffff, 0.06); g.fillRect(0, top + 3, WORLD_W, 3);
  objs.push(g);
  for (const wx of cfg.windows ?? []) objs.push(tImg(scene, "window", wx, top * 0.46, PX, 0.5).setDepth(-1001));
  for (const it of cfg.items) {
    const im = tImg(scene, it.f, it.x, it.y, it.s ?? PX, 1).setDepth(it.depth ?? it.y);
    if (it.flip) im.setFlipX(true);
    objs.push(im);
  }
  return objs;
}

export interface OutdoorCfg {
  ground: number;
  items: Item[];
  path?: boolean;       // lay the autotiled dirt path joining the doors
  water?: { y: number; h?: number };
  waterfalls?: { x: number; y: number }[];
}

// ---- path autotiling -------------------------------------------------------
const D = T * PX; // 48px display tile

/** Build path cells (48px grid) that join every door down to a central spine and
 *  the spine to the spawn — sized to the room. Every stem is 2 tiles wide and
 *  CENTRED on its door/spawn (the pair of columns straddles the centre line) so the
 *  path lines up directly under each doorway. */
function genPathCells(def: RoomDef): Set<string> {
  const s = new Set<string>();
  const add = (c0: number, c1: number, r0: number, r1: number) => {
    for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) s.add(`${c},${r}`);
  };
  const spine = Math.round((roomH(def) * 0.5) / D);
  const top = Math.round(190 / D);
  // the two columns whose shared edge sits on pixel x — i.e. centred on x
  const pair = (x: number): [number, number] => { const c = Math.round(x / D); return [c - 1, c]; };
  const doorPairs = def.doors.map((d) => pair(d.x + d.w / 2));
  for (const [a, b] of doorPairs) add(a, b, top, spine + 1);       // door -> spine
  const [sa, sb] = pair(def.spawn.x);
  const allCols = [...doorPairs.flat(), sa, sb];
  add(Math.min(...allCols), Math.max(...allCols), spine, spine + 1); // horizontal spine
  add(sa, sb, spine, Math.round(def.spawn.y / D));                // spine -> spawn
  return s;
}

function pathPiece(n: boolean, s: boolean, e: boolean, w: boolean): string {
  if (!n && !w) return "p_tl"; if (!n && !e) return "p_tr";
  if (!s && !w) return "p_bl"; if (!s && !e) return "p_br";
  if (!n) return "p_t"; if (!s) return "p_b";
  if (!w) return "p_l"; if (!e) return "p_r";
  return "p_c";
}

function renderPath(scene: Phaser.Scene, cells: Set<string>): Phaser.GameObjects.GameObject[] {
  const objs: Phaser.GameObjects.GameObject[] = [];
  for (const key of cells) {
    const [c, r] = key.split(",").map(Number);
    const frame = pathPiece(
      cells.has(`${c},${r - 1}`), cells.has(`${c},${r + 1}`),
      cells.has(`${c + 1},${r}`), cells.has(`${c - 1},${r}`),
    );
    objs.push(scene.add.image(c * D + D / 2, r * D + D / 2, texKey(frame), frame).setOrigin(0.5).setScale(PX).setDepth(-999));
  }
  return objs;
}

/** Place a prop CLAMPED fully inside the world so nothing is ever cut at an edge.
 *  (x,y) is the base point; the sprite occupies x±w/2 across and y-h..y up. */
function placeProp(scene: Phaser.Scene, frame: string, x: number, y: number, W: number, H: number, flip = false, depth?: number): Phaser.GameObjects.Image {
  const f = FRAMES[frame];
  const wPx = (f ? f[3] : 16) * PX, hPx = (f ? f[4] : 16) * PX;
  const cx = Math.max(wPx / 2, Math.min(W - wPx / 2, x));
  const cy = Math.max(hPx, Math.min(H, y));
  const im = tImg(scene, frame, cx, cy, PX, 1).setDepth(depth ?? cy);
  if (flip) im.setFlipX(true);
  return im;
}

/** A forest that FRAMES the room: dense tree walls down the left & right edges, a
 *  tree line across the top (broken by a clear lane at each door) and the bottom
 *  (broken at the spawn), with bushes + ground detail tucked along the inner edge.
 *  The whole central play-field is deliberately left open. Everything is clamped
 *  fully inside, so nothing is ever cut at an edge. */
function forestBorder(scene: Phaser.Scene, def: RoomDef): Phaser.GameObjects.GameObject[] {
  const objs: Phaser.GameObjects.GameObject[] = [];
  const W = roomW(def), H = roomH(def);
  const doorXs = def.doors.map((d) => d.x + d.w / 2);
  const inDoorLane = (x: number) => doorXs.some((dx) => Math.abs(x - dx) < 135);
  const firs = ["w_pine", "w_pine2", "w_tree", "w_treemed"];
  const bigs = ["w_bigtree", "w_bigtree2", "w_bigtree3", "w_bigtree4", "w_bigtree5", "w_bigtree6"];
  const bushes = ["w_bush", "w_bush2", "w_bush3", "w_bush4", "w_bush5", "w_bush6", "w_bushbig", "w_bramble"];
  const details = ["w_stump", "w_sapling", "w_twig", "w_rock", "w_rock2", "w_dead", "w_dead2"];
  let i = 0;
  const jit = (n: number, m: number) => ((i * n) % m) - m / 2;
  const SIDE = 240; // width of the wooded band on each side; the middle stays open

  // ---- left & right tree walls: outer column of big trees + inner row of firs ----
  for (const side of [0, 1] as const) {
    const sx = side === 0 ? 1 : -1, edge = side === 0 ? 0 : W, flip = side === 1;
    for (let y = 210; y < H - 60; y += 138) {
      objs.push(placeProp(scene, bigs[i % bigs.length], edge + sx * (130 + ((i * 23) % 50)), y, W, H, flip)); i++;
      objs.push(placeProp(scene, firs[i % firs.length], edge + sx * (275 + ((i * 17) % 50)), y + 70, W, H, flip)); i++;
    }
  }
  // ---- top tree line between the doors (skip door lanes + the already-walled sides) ----
  for (let x = SIDE; x < W - SIDE; x += 168) {
    if (inDoorLane(x)) continue;
    const pool = i % 3 === 0 ? bigs : firs;
    objs.push(placeProp(scene, pool[i % pool.length], x + jit(13, 26), 250 + ((i * 31) % 60), W, H, i % 2 === 0)); i++;
  }
  // ---- bottom tree line (skip the spawn gap + the walled sides) ----
  for (let x = SIDE; x < W - SIDE; x += 232) {
    if (Math.abs(x - def.spawn.x) < 230) continue;
    objs.push(placeProp(scene, bigs[i % bigs.length], x + jit(29, 28), H - 10, W, H, i % 2 === 0)); i++;
  }
  // ---- bushes + ground detail hugging the inner edge of the walls (off the middle) ----
  for (let y = 320; y < H - 120; y += 150) {
    for (const bx of [330 + ((i * 7) % 40), W - 330 - ((i * 11) % 40)]) {
      objs.push(placeProp(scene, bushes[i % bushes.length], bx, y, W, H, bx > W / 2)); i++;
    }
  }
  for (let y = 380; y < H - 140; y += 240) {
    for (const dx of [250 + ((i * 5) % 30), W - 250 - ((i * 9) % 30)]) {
      objs.push(placeProp(scene, details[i % details.length], dx, y + 30, W, H, dx > W / 2)); i++;
    }
  }
  return objs;
}

/** Scatter flat snow patches / drifts across the OPEN field — drawn BELOW the path
 *  (depth -999.5) so the trail stays clean, and kept off the central spine — to
 *  break up the otherwise-bare snow. */
function groundDecals(scene: Phaser.Scene, def: RoomDef): Phaser.GameObjects.GameObject[] {
  const objs: Phaser.GameObjects.GameObject[] = [];
  const W = roomW(def), H = roomH(def);
  const decals = ["w_snowpatch", "w_drift", "w_drift2", "w_fade"];
  let i = 0;
  for (let y = 300; y < H - 90; y += 150) {
    for (let x = 360; x < W - 340; x += 360) {
      const px = x + ((i * 53) % 140) - 70, py = y + ((i * 37) % 90) - 45;
      if (Math.abs(px - W / 2) >= 90) // keep the central spine clear
        objs.push(tImg(scene, decals[i % decals.length], px, py, PX, 0.5).setDepth(-999.5).setAlpha(0.8));
      i++;
    }
  }
  return objs;
}

/** Build an outdoor room: big top-down snow world + autotiled path + forest. */
export function buildOutdoor(scene: Phaser.Scene, def: RoomDef, cfg: OutdoorCfg): Phaser.GameObjects.GameObject[] {
  const W = roomW(def), H = roomH(def);
  const objs: Phaser.GameObjects.GameObject[] = [];
  const g = scene.add.graphics().setDepth(-1000); objs.push(g);
  g.fillStyle(cfg.ground, 1); g.fillRect(0, 0, W, H);
  g.fillStyle(0xc9d6e0, 0.12);
  for (let i = 0; i < 16; i++) g.fillEllipse(120 + ((i * 277) % (W - 200)), 120 + ((i * 191) % (H - 200)), 240, 80);
  if (cfg.path !== false) objs.push(...renderPath(scene, genPathCells(def)));
  objs.push(...groundDecals(scene, def));
  if (cfg.water) {
    const wy = cfg.water.y, wh = cfg.water.h ?? 70;
    const water = scene.add.tileSprite(W / 2, wy, W, wh, texKey("w_water"), "w_water").setDepth(-996);
    water.tileScaleX = water.tileScaleY = PX;
    water.setData("scroll", 0.25);
    objs.push(water);
  }
  for (const wf of cfg.waterfalls ?? []) {
    const sp = scene.add.sprite(wf.x, wf.y, "ts_waterfall").setOrigin(0.5, 1).setScale(PX).setDepth(wf.y);
    sp.play("waterfall"); objs.push(sp);
  }
  objs.push(...forestBorder(scene, def));
  for (const it of cfg.items) objs.push(placeProp(scene, it.f, it.x, it.y, W, H, !!it.flip, it.depth));
  return objs;
}
