import Phaser from "phaser";
import {
  ROOMS, IGLOO_DEF, DEFAULT_ROOM, WORLD_W, WORLD_H, roomW, roomH,
  FURNITURE_BY_ID, pinsInRoom, getActiveEvent,
  type RoomDef, type PlayerView, type FurnitureView, type GameEventDef,
} from "@shared";
import { game } from "../../net/GameClient";
import { ROOM_BACKGROUNDS } from "../../assets/manifest";
import { ensureTextures, hexColor, FURN_SCALE } from "../gfx";
import { loadTilesets, registerFrames, tImg } from "../tiles";
import { buildTiledRoom, overlayProps } from "../roomBuilds";
import { Penguin } from "../Penguin";
import { sceneBridge } from "../sceneBridge";
import { RENDER_SCALE } from "../render";

interface DoorHit { rect: Phaser.Geom.Rectangle; toRoom: string; }
interface FeatureHit { rect: Phaser.Geom.Rectangle; type: string; id?: string; x: number; y: number; }
type Pending =
  | { kind: "door"; toRoom: string }
  | { kind: "feature"; ftype: string; id?: string }
  | null;

const THEME_GROUND: Record<string, number> = {
  snow: 0xeaf2ff, water: 0xe3cfa0, interior: 0x6b4a2f,
  night: 0x241d44, forest: 0x4e7a39, stage: 0x33304d,
};

export class WorldScene extends Phaser.Scene {
  private penguins = new Map<string, Penguin>();
  private furnitureObjs = new Map<string, Phaser.GameObjects.Container>();
  private layout: Phaser.GameObjects.GameObject[] = [];
  private pinObjs: Phaser.GameObjects.GameObject[] = [];
  private pinHits: { rect: Phaser.Geom.Rectangle; id: string }[] = [];
  private doors: DoorHit[] = [];
  private features: FeatureHit[] = [];
  private bounds = new Phaser.Geom.Rectangle(0, 0, WORLD_W, WORLD_H);
  private pending: Pending = null;

  // camera: player-chosen zoom (1 = whole room fits; >1 zooms in + follows player)
  private userZoom = Math.min(2.5, Math.max(1, Number(localStorage.getItem("cp_zoom")) || 1));
  private selfPenguin?: Penguin;
  private rW = WORLD_W;
  private rH = WORLD_H;

  // igloo editing
  private editMode = false;
  private selectedFurniture: string | null = null;

  // bound handlers (so we can detach on shutdown)
  private h = {
    add: (p: { id: string; view: PlayerView; isSelf: boolean }) => this.onPlayerAdd(p),
    change: (p: { id: string; view: PlayerView }) => this.onPlayerChange(p),
    remove: (p: { id: string }) => this.onPlayerRemove(p.id),
    fAdd: (f: FurnitureView) => this.onFurnitureAdd(f),
    fRemove: (p: { id: string }) => this.onFurnitureRemove(p.id),
    room: () => this.rebuildRoom(),
    pins: () => this.drawPins(),
  };

  constructor() {
    super("world");
  }

  preload() {
    loadTilesets(this);
    for (const [room, path] of Object.entries(ROOM_BACKGROUNDS)) {
      const key = `bg_${room}`;
      if (this.textures.exists(key)) continue;
      if (path.toLowerCase().endsWith(".svg")) this.load.svg(key, path, { width: WORLD_W, height: WORLD_H });
      else this.load.image(key, path);
    }
  }

  create() {
    ensureTextures(this);
    registerFrames(this);
    sceneBridge.scene = this;

    this.rebuildRoom();

    game.on("playerAdd", this.h.add);
    game.on("playerChange", this.h.change);
    game.on("playerRemove", this.h.remove);
    game.on("furnitureAdd", this.h.fAdd);
    game.on("furnitureRemove", this.h.fRemove);
    game.on("roomChanged", this.h.room);
    game.on("pins", this.h.pins);

    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => this.onPointer(p.worldX, p.worldY));

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  private teardown() {
    game.off("playerAdd", this.h.add);
    game.off("playerChange", this.h.change);
    game.off("playerRemove", this.h.remove);
    game.off("furnitureAdd", this.h.fAdd);
    game.off("furnitureRemove", this.h.fRemove);
    game.off("roomChanged", this.h.room);
    game.off("pins", this.h.pins);
    if (sceneBridge.scene === this) sceneBridge.scene = null;
  }

  // ---- room building -------------------------------------------------------
  private currentDef(): RoomDef {
    if (game.isIgloo) return { id: game.roomId, ...IGLOO_DEF };
    return ROOMS[game.roomId] ?? ROOMS[DEFAULT_ROOM];
  }

  rebuildRoom() {
    // wipe everything
    this.penguins.forEach((p) => p.destroy());
    this.penguins.clear();
    this.furnitureObjs.forEach((o) => o.destroy());
    this.furnitureObjs.clear();
    this.layout.forEach((o) => o.destroy());
    this.layout = [];
    this.doors = [];
    this.features = [];
    this.pending = null;
    this.editMode = false;
    this.selectedFurniture = null;
    this.selfPenguin = undefined;
    this.cameras.main.stopFollow();

    const def = this.currentDef();
    this.bounds = new Phaser.Geom.Rectangle(def.bounds.x, def.bounds.y, def.bounds.w, def.bounds.h);
    const rW = roomW(def), rH = roomH(def);
    this.rW = rW; this.rH = rH;
    this.cameras.main.setBackgroundColor(def.bg);
    this.cameras.main.setBounds(0, 0, rW, rH);
    this.applyCamera();
    // Text is rasterised at this device-pixel density so it stays crisp under zoom.
    const labelRes = RENDER_SCALE;

    const top = def.bounds.y - 26;
    const bgKey = `bg_${def.id}`;
    const tiled = buildTiledRoom(this, def, top);
    if (tiled) {
      // tile-composed room from the imported tilesets
      this.layout.push(...tiled);
      const ev = getActiveEvent();
      if (ev && !game.isIgloo) { const g = this.add.graphics().setDepth(1450); this.layout.push(g); this.decorEvent(g, ev, rW); }
    } else if (!game.isIgloo && this.textures.exists(bgKey)) {
      // painted background image for this room (drop a real PNG in assets/manifest)
      const bg = this.add.image(WORLD_W / 2, WORLD_H / 2, bgKey).setDepth(-1001);
      bg.setDisplaySize(WORLD_W, WORLD_H);
      this.layout.push(bg);
      const ev = getActiveEvent();
      if (ev) { const g = this.add.graphics().setDepth(-900); this.layout.push(g); this.decorEvent(g, ev); }
    } else {
      this.drawScenery(def);
      this.layout.push(...overlayProps(this, def));
    }

    // (room name is shown in the HUD; no in-canvas title so it doesn't scroll off)

    // doors — a dark doorway with a wooden sign above
    for (const d of def.doors) {
      const rect = new Phaser.Geom.Rectangle(d.x, d.y, d.w, d.h);
      this.doors.push({ rect, toRoom: d.toRoom });
      const cx = d.x + d.w / 2;
      const sh = this.add.graphics().setDepth(-999);
      sh.fillStyle(0x000000, 0.18); sh.fillEllipse(cx, d.y + d.h + 8, d.w - 6, 20);
      // real wooden door tile + sign, kept ABOVE scenery so trees never hide it
      const doorImg = tImg(this, "idoor", cx, d.y + d.h + 8, 2.4, 1).setDepth(1400);
      const g = this.add.graphics().setDepth(1401);
      g.fillStyle(0x7a4a1f, 1); g.fillRoundedRect(cx - d.w / 2 + 6, d.y - 4, d.w - 12, 30, 6);
      g.lineStyle(2, 0x4d2e12, 1); g.strokeRoundedRect(cx - d.w / 2 + 6, d.y - 4, d.w - 12, 30, 6);
      const t = this.add.text(cx, d.y + 11, `➜ ${d.label}`, {
        fontFamily: "system-ui, sans-serif", fontSize: "14px", color: "#ffe9c2",
        stroke: "#3a2410", strokeThickness: 3, align: "center",
      }).setResolution(labelRes).setOrigin(0.5).setDepth(1402);
      this.layout.push(sh, doorImg, g, t);
    }

    // features (shop / minigame / igloo entry) — rounded billboard with icon
    for (const f of def.features) {
      const w = 158, hgt = 76;
      const rect = new Phaser.Geom.Rectangle(f.x - w / 2, f.y - hgt / 2, w, hgt);
      this.features.push({ rect, type: f.type, id: f.id, x: f.x, y: f.y });
      const color = f.type === "shop" ? 0x27ae60 : f.type === "minigame" ? 0xe67e22
        : f.type === "petshop" ? 0x2e86c1 : 0x8e44ad;
      const g = this.add.graphics().setDepth(1390);
      g.fillStyle(0x000000, 0.25); g.fillRoundedRect(f.x - w / 2, f.y - hgt / 2 + 4, w, hgt, 14);
      g.fillStyle(color, 0.95); g.fillRoundedRect(f.x - w / 2, f.y - hgt / 2, w, hgt, 14);
      g.lineStyle(3, 0xffffff, 0.9); g.strokeRoundedRect(f.x - w / 2, f.y - hgt / 2, w, hgt, 14);
      const icon = f.type === "shop" ? "🛍️" : f.type === "minigame" ? "🎮"
        : f.type === "petshop" ? "🐾" : "🏠";
      const t = this.add.text(f.x, f.y, `${icon}\n${f.label}`, {
        fontFamily: "system-ui, sans-serif", fontSize: "15px", color: "#ffffff",
        stroke: "#000", strokeThickness: 3, align: "center", wordWrap: { width: w - 14 },
      }).setResolution(labelRes).setOrigin(0.5).setDepth(1391);
      this.layout.push(g, t);
    }

    if (game.isIgloo && game.isIglooOwner) {
      const hint = this.add.text(WORLD_W / 2, WORLD_H - 24,
        "Open the Igloo Editor to place furniture", {
        fontFamily: "system-ui, sans-serif", fontSize: "13px", color: "#ffffff",
        stroke: "#000", strokeThickness: 3,
      }).setResolution(labelRes).setOrigin(0.5).setDepth(-790);
      this.layout.push(hint);
    }

    // seed entities from the net snapshot
    game.players.forEach((view, id) => this.onPlayerAdd({ id, view, isSelf: id === game.sessionId }));
    game.furniture.forEach((view) => this.onFurnitureAdd(view));
    this.drawPins();
  }

  /** Draw the uncollected hidden pins for the current room. */
  private drawPins() {
    this.pinObjs.forEach((o) => o.destroy());
    this.pinObjs = [];
    this.pinHits = [];
    if (game.isIgloo) return;
    for (const pin of pinsInRoom(game.roomId)) {
      if (game.collectedPins.includes(pin.id)) continue;
      const glow = this.add.circle(pin.x, pin.y, 16, 0xffe66d, 0.35).setDepth(pin.y - 1);
      const icon = this.add.text(pin.x, pin.y, pin.icon, { fontSize: "22px" }).setResolution(RENDER_SCALE).setOrigin(0.5).setDepth(pin.y);
      this.tweens.add({ targets: glow, scale: 1.4, alpha: 0.15, duration: 700, yoyo: true, repeat: -1 });
      this.pinObjs.push(glow, icon);
      this.pinHits.push({ rect: new Phaser.Geom.Rectangle(pin.x - 22, pin.y - 22, 44, 44), id: pin.id });
    }
  }

  // ---- scenery -------------------------------------------------------------
  private drawScenery(def: RoomDef) {
    const g = this.add.graphics().setDepth(-1000);
    this.layout.push(g);

    const sky = hexColor(def.sky ?? def.bg);
    const base = hexColor(def.bg);
    g.fillGradientStyle(sky, sky, base, base, 1);
    g.fillRect(0, 0, WORLD_W, WORLD_H);

    const top = def.bounds.y - 26;
    const ground = THEME_GROUND[def.theme] ?? base;
    g.fillStyle(ground, 1);
    g.fillRoundedRect(-20, top, WORLD_W + 40, WORLD_H - top + 20, 26);
    g.fillStyle(0xffffff, 0.08);
    g.fillRect(0, top, WORLD_W, 5);

    switch (def.theme) {
      case "snow": this.decorSnow(g, top); break;
      case "water": this.decorWater(g, top); break;
      case "night": this.decorNight(g, top); break;
      case "interior": this.decorInterior(g, top); break;
      case "forest": this.decorForest(g, top); break;
      default: break;
    }
    this.decorRoom(g, def, top);
    const ev = getActiveEvent();
    if (ev && !game.isIgloo) this.decorEvent(g, ev);
  }

  /** Festive bunting + balloons shown in every room while a party is on. */
  private decorEvent(g: Phaser.GameObjects.Graphics, ev: GameEventDef, w = WORLD_W) {
    const c = hexColor(ev.accent);
    const alt = 0xffd43b;
    // bunting across the very top
    g.lineStyle(2, 0xffffff, 0.5);
    g.lineBetween(0, 46, w, 52);
    for (let x = 16, i = 0; x < w - 16; x += 46, i++) {
      g.fillStyle(i % 2 ? alt : c, 0.95);
      g.fillTriangle(x, 50, x + 30, 50, x + 15, 68);
    }
    // a couple of balloons
    for (const [bx, col] of [[70, c], [w - 70, alt]] as const) {
      g.lineStyle(1, 0xffffff, 0.5);
      g.lineBetween(bx, 92, bx, 150);
      g.fillStyle(col, 0.95);
      g.fillEllipse(bx, 110, 34, 42);
      g.fillStyle(0xffffff, 0.35);
      g.fillEllipse(bx - 6, 102, 8, 12);
    }
  }

  /** Unique props per room so every map looks different. */
  private decorRoom(g: Phaser.GameObjects.Graphics, def: RoomDef, top: number) {
    const W = WORLD_W;
    const id = def.id;
    const line = (x1: number, y1: number, x2: number, y2: number, w: number, c: number, a = 1) => {
      g.lineStyle(w, c, a); g.lineBetween(x1, y1, x2, y2);
    };

    if (id.startsWith("igloo:")) {
      // ice-block back wall + a cozy rug
      g.fillStyle(0xd6e3f0, 1);
      for (let x = 20; x < W - 20; x += 70) g.fillRoundedRect(x, top - 34, 64, 30, 8);
      g.fillStyle(0xc2d4e8, 0.7);
      for (let x = 55; x < W - 20; x += 70) g.fillRoundedRect(x, top - 18, 64, 18, 8);
      g.fillStyle(0x8e44ad, 0.45); g.fillEllipse(W / 2, top + 120, 260, 90);
      g.fillStyle(0x9b59b6, 0.4); g.fillEllipse(W / 2, top + 120, 180, 60);
      return;
    }

    switch (id) {
      case "town": {
        g.fillStyle(0x223052, 1);
        g.fillRect(24, top - 92, 120, 92); g.fillRect(168, top - 64, 86, 64);
        g.fillRect(W - 150, top - 104, 128, 104); g.fillRect(W - 250, top - 60, 78, 60);
        g.fillStyle(0xffe9a8, 0.55);
        for (let y = top - 80; y < top - 12; y += 24) for (let x = 38; x < 132; x += 30) g.fillRect(x, y, 14, 12);
        for (let y = top - 92; y < top - 16; y += 26) for (let x = W - 138; x < W - 36; x += 30) g.fillRect(x, y, 14, 12);
        // clock tower
        g.fillStyle(0x9aa7c4, 1); g.fillRect(W / 2 - 26, top - 150, 52, 150);
        g.fillStyle(0x7a3b3b, 1); g.fillTriangle(W / 2 - 36, top - 150, W / 2 + 36, top - 150, W / 2, top - 192);
        g.fillStyle(0xffffff, 1); g.fillCircle(W / 2, top - 116, 16);
        line(W / 2, top - 116, W / 2, top - 127, 2, 0x333333); line(W / 2, top - 116, W / 2 + 9, top - 116, 2, 0x333333);
        break;
      }
      case "coffee": {
        g.fillStyle(0x4e342e, 1); g.fillRoundedRect(W / 2 - 180, top - 30, 360, 32, 6);
        g.fillStyle(0x9e9e9e, 1); g.fillRect(W / 2 - 160, top - 70, 52, 42);
        g.fillStyle(0x616161, 1); g.fillRect(W / 2 - 150, top - 60, 14, 16);
        g.fillStyle(0xffffff, 1);
        for (let i = 0; i < 5; i++) g.fillRoundedRect(W / 2 - 60 + i * 30, top - 24, 16, 14, 3);
        g.fillStyle(0x6d4c41, 1); g.fillRoundedRect(W / 2 - 90, 70, 180, 34, 8);
        g.fillStyle(0xd7ccc8, 1); g.fillRoundedRect(W / 2 - 74, 80, 148, 14, 4);
        g.fillStyle(0x8d6e63, 1); g.fillEllipse(W - 120, top - 14, 70, 34); g.fillEllipse(W - 90, top - 8, 60, 30);
        break;
      }
      case "nightclub": {
        // disco ball
        line(W / 2, 40, W / 2, 70, 2, 0x888888);
        g.fillStyle(0xb0c4de, 1); g.fillCircle(W / 2, 86, 22);
        g.fillStyle(0xffffff, 0.5); g.fillCircle(W / 2 - 6, 80, 5); g.fillCircle(W / 2 + 7, 90, 4);
        const rays = [0xff5d8f, 0x5db0ff, 0xffd45d, 0x5dffa8];
        for (let i = 0; i < 4; i++) { g.fillStyle(rays[i], 0.12); g.fillTriangle(W / 2, 86, W / 2 - 140 + i * 95, top, W / 2 - 80 + i * 95, top); }
        // speakers
        g.fillStyle(0x1a1a1a, 1); g.fillRect(40, top - 80, 60, 80); g.fillRect(W - 100, top - 80, 60, 80);
        g.fillStyle(0x444444, 1); g.fillCircle(70, top - 50, 16); g.fillCircle(W - 70, top - 50, 16);
        g.fillCircle(70, top - 22, 9); g.fillCircle(W - 70, top - 22, 9);
        break;
      }
      case "plaza": {
        g.fillStyle(0x4a2f1a, 1); g.fillRect(W / 2 - 170, top - 18, 340, 20);
        g.fillStyle(0xc0392b, 1); g.fillRect(W / 2 - 130, 72, 260, 30);
        g.fillStyle(0xecf0f1, 1); g.fillRoundedRect(W / 2 - 110, 80, 220, 14, 3);
        for (const tx of [70, W - 70]) {
          g.fillStyle(0x5b3a1e, 1); g.fillRect(tx - 7, top - 60, 14, 60);
          g.fillStyle(0x2e7d32, 1); g.fillCircle(tx, top - 66, 28); g.fillCircle(tx - 18, top - 50, 20); g.fillCircle(tx + 18, top - 50, 20);
        }
        break;
      }
      case "pizza": {
        // checkered floor
        for (let y = top, r = 0; y < WORLD_H; y += 38, r++)
          for (let x = 0, cI = r; x < W; x += 38, cI++) {
            g.fillStyle(cI % 2 ? 0xb71c1c : 0xeceff1, 0.18); g.fillRect(x, y, 38, 38);
          }
        g.fillStyle(0x5d4037, 1); g.fillRoundedRect(W / 2 - 150, top - 28, 300, 30, 6);
        // big pizza
        g.fillStyle(0xf5c542, 1); g.fillCircle(W / 2, top - 70, 40);
        g.fillStyle(0xe67e22, 1); g.fillCircle(W / 2, top - 70, 40); g.fillStyle(0xf6d365, 1); g.fillCircle(W / 2, top - 70, 33);
        g.fillStyle(0xc0392b, 1);
        for (const [dx, dy] of [[-14, -8], [12, -10], [0, 10], [16, 8], [-12, 12]] as const) g.fillCircle(W / 2 + dx, top - 70 + dy, 5);
        break;
      }
      case "petshop": {
        for (let i = 0; i < 3; i++) {
          const cx = 120 + i * 150;
          g.fillStyle(0x6d4c41, 1); g.fillRoundedRect(cx - 40, top - 78, 80, 70, 8);
          g.fillStyle(0x3e2723, 1); g.fillRoundedRect(cx - 32, top - 70, 64, 54, 6);
          g.lineStyle(2, 0x8d6e63, 1); for (let x = cx - 26; x <= cx + 26; x += 13) g.lineBetween(x, top - 70, x, top - 16);
          const pc = [0x3a78d6, 0xe23b3b, 0x3fae54][i];
          g.fillStyle(pc, 1); g.fillEllipse(cx, top - 40, 30, 26);
        }
        g.fillStyle(0xffffff, 0.85); g.fillEllipse(W - 130, top - 18, 50, 18);
        break;
      }
      case "dock": {
        // planks
        g.lineStyle(2, 0xcdb48a, 0.6); for (let y = top + 10; y < WORLD_H; y += 26) g.lineBetween(0, y, W, y);
        // boat on the water band
        g.fillStyle(0x6d4c41, 1); g.beginPath(); g.moveTo(W - 230, top + 8); g.lineTo(W - 90, top + 8); g.lineTo(W - 110, top + 34); g.lineTo(W - 210, top + 34); g.closePath(); g.fillPath();
        line(W - 160, top + 8, W - 160, top - 56, 3, 0x5d4037);
        g.fillStyle(0xffffff, 1); g.fillTriangle(W - 158, top - 54, W - 158, top - 8, W - 110, top - 8);
        break;
      }
      case "beach": {
        // palm
        line(110, top, 96, top - 70, 8, 0x8d6e63);
        g.fillStyle(0x2e8b57, 1);
        for (const a of [-0.9, -0.3, 0.3, 0.9]) g.fillEllipse(96 + Math.cos(a) * 34, top - 70 + Math.sin(a) * 18 - 6, 60, 22);
        g.fillStyle(0x6d4c41, 1); g.fillCircle(96, top - 64, 5); g.fillCircle(104, top - 60, 5);
        // umbrella
        line(W - 150, top, W - 150, top - 70, 4, 0x7a4a1f);
        g.fillStyle(0xe74c3c, 1); g.fillEllipse(W - 150, top - 72, 120, 44);
        g.fillStyle(0xffffff, 1); g.fillTriangle(W - 150, top - 94, W - 150, top - 72, W - 120, top - 66);
        // beach ball
        g.fillStyle(0xffffff, 1); g.fillCircle(W - 250, top - 16, 16);
        g.fillStyle(0x3498db, 1); g.fillTriangle(W - 250, top - 32, W - 250, top, W - 236, top - 24);
        break;
      }
      case "forts": {
        for (const fx of [120, W - 200]) {
          g.fillStyle(0xffffff, 1);
          for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++)
            g.fillRoundedRect(fx + c * 38 + r * 19, top - 26 - r * 26, 34, 24, 5);
          g.fillStyle(0xdfeaf7, 1);
          for (let r = 0; r < 3; r++) for (let c = 0; c < 4 - r; c++)
            g.strokeRect(fx + c * 38 + r * 19, top - 26 - r * 26, 34, 24);
        }
        g.fillStyle(0xffffff, 1);
        for (const [x, y] of [[W / 2 - 20, top - 12], [W / 2, top - 18], [W / 2 + 22, top - 10]] as const) g.fillCircle(x, y, 9);
        line(W / 2, top - 96, W / 2, top - 56, 2, 0x7a4a1f); g.fillStyle(0xe74c3c, 1); g.fillTriangle(W / 2, top - 96, W / 2, top - 74, W / 2 + 26, top - 85);
        break;
      }
      case "ski": {
        g.fillStyle(0xffffff, 1); g.fillTriangle(0, top, 360, top, 0, top - 150);
        g.fillStyle(0xe3ecf7, 1); g.fillTriangle(0, top, 250, top, 0, top - 110);
        line(120, top - 120, W - 60, 70, 3, 0x555555);
        g.fillStyle(0x34495e, 1);
        for (let t = 0.25; t < 1; t += 0.25) { const x = 120 + (W - 180) * t, y = (top - 120) + (70 - (top - 120)) * t; g.fillRect(x - 6, y, 12, 10); }
        for (const [fx, fc] of [[420, 0xe74c3c], [520, 0x3498db], [620, 0xe74c3c]] as const) { line(fx, top, fx, top - 30, 2, 0x888888); g.fillStyle(fc, 1); g.fillTriangle(fx, top - 30, fx, top - 18, fx + 18, top - 24); }
        break;
      }
      case "dojo": {
        for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) {
          g.fillStyle((r + c) % 2 ? 0x4e7d3a : 0x5a8c44, 0.5);
          g.fillRoundedRect(W / 2 - 240 + c * 80, top + 30 + r * 70, 76, 66, 4);
        }
        for (const lx of [W / 2 - 150, W / 2 + 150]) { line(lx, 60, lx, 92, 2, 0x555555); g.fillStyle(0xe74c3c, 1); g.fillEllipse(lx, 104, 30, 38); g.fillStyle(0xc0392b, 1); g.fillRect(lx - 4, 122, 8, 10); }
        g.fillStyle(0x2c3e50, 1); g.fillRoundedRect(W / 2 - 60, 64, 120, 44, 8);
        g.fillStyle(0xecf0f1, 1); g.fillCircle(W / 2, 86, 16);
        g.fillStyle(0xe74c3c, 1); g.beginPath(); g.arc(W / 2, 86, 16, -Math.PI / 2, Math.PI / 2); g.fillPath();
        break;
      }
      default: break;
    }
  }

  private decorSnow(g: Phaser.GameObjects.Graphics, top: number) {
    g.fillStyle(0xffffff, 0.95);
    for (const [x, r] of [[130, 38], [330, 26], [650, 44], [850, 28]] as const) {
      g.fillEllipse(x, top + 20, r * 2, r);
    }
    g.fillStyle(0xffffff, 0.5);
    for (let i = 0; i < 30; i++) g.fillCircle((i * 137) % WORLD_W, 60 + ((i * 53) % (top - 60)), 2);
  }
  private decorWater(g: Phaser.GameObjects.Graphics, top: number) {
    g.fillStyle(0x2e93c9, 1); g.fillRect(0, top, WORLD_W, 42);
    g.fillStyle(0x66bce8, 1);
    for (let x = 0; x < WORLD_W; x += 64) g.fillEllipse(x, top + 8, 52, 12);
    g.fillStyle(0xfff3b0, 0.9); g.fillCircle(WORLD_W - 130, 96, 36);
  }
  private decorNight(g: Phaser.GameObjects.Graphics, top: number) {
    const cols = [0xff5d8f, 0x5db0ff, 0xffd45d, 0x8a5dff, 0x5dffa8];
    let i = 0;
    for (let y = top + 12; y < WORLD_H - 12; y += 50)
      for (let x = 24; x < WORLD_W - 24; x += 66) {
        g.fillStyle(cols[i++ % cols.length], 0.16);
        g.fillRoundedRect(x, y, 54, 38, 6);
      }
  }
  private decorInterior(g: Phaser.GameObjects.Graphics, top: number) {
    g.fillStyle(0x000000, 0.12); g.fillRect(0, top, WORLD_W, 4);
    g.fillStyle(0x3c2a1a, 1); g.fillRoundedRect(WORLD_W / 2 - 200, top - 14, 400, 18, 6);
    g.fillStyle(0xffffff, 0.06); g.fillRoundedRect(WORLD_W / 2 - 200, top - 14, 400, 5, 6);
  }
  private decorForest(g: Phaser.GameObjects.Graphics, top: number) {
    for (const x of [90, WORLD_W - 110]) {
      g.fillStyle(0x5b3a1e, 1); g.fillRect(x - 6, top - 44, 12, 52);
      g.fillStyle(0x2f7d32, 1); g.fillTriangle(x - 34, top - 22, x + 34, top - 22, x, top - 74);
    }
  }

  // ---- entity events -------------------------------------------------------
  private onPlayerAdd({ id, view, isSelf }: { id: string; view: PlayerView; isSelf: boolean }) {
    if (this.penguins.has(id)) { this.onPlayerChange({ id, view }); return; }
    const peng = new Penguin(this, view, isSelf);
    this.penguins.set(id, peng);
    if (isSelf) { this.selfPenguin = peng; this.applyCamera(); }
  }

  // ---- camera zoom (player-controlled) -------------------------------------
  /** Apply the current zoom: fit-to-room when userZoom==1, else zoom in and
   *  follow the player so they can explore a bigger view of the world. */
  private applyCamera() {
    const cam = this.cameras.main;
    const fit = Math.min(1, WORLD_W / this.rW, WORLD_H / this.rH);
    cam.setZoom(RENDER_SCALE * fit * this.userZoom);
    if (this.userZoom > 1.001 && this.selfPenguin) {
      cam.startFollow(this.selfPenguin, true, 0.18, 0.18);
    } else {
      cam.stopFollow();
      cam.centerOn(this.rW / 2, this.rH / 2);
    }
  }

  setUserZoom(z: number) {
    this.userZoom = Math.min(2.5, Math.max(1, z));
    localStorage.setItem("cp_zoom", String(this.userZoom));
    this.applyCamera();
  }
  getUserZoom() { return this.userZoom; }
  private onPlayerChange({ id, view }: { id: string; view: PlayerView }) {
    this.penguins.get(id)?.applyView(view);
  }
  private onPlayerRemove(id: string) {
    this.penguins.get(id)?.destroy();
    this.penguins.delete(id);
  }

  private onFurnitureAdd(view: FurnitureView) {
    if (this.furnitureObjs.has(view.id)) return;
    const def = FURNITURE_BY_ID[view.itemId];
    if (!def) return;
    const parts: Phaser.GameObjects.GameObject[] = [];
    // soft contact shadow on the floor
    const sh = this.add.graphics();
    sh.fillStyle(0x000000, 0.16); sh.fillEllipse(0, 0, def.w * 0.9, 12);
    parts.push(sh);
    if (this.textures.exists(view.itemId)) {
      // real furniture art (baked at FURN_SCALE) sitting on the floor
      parts.push(this.add.image(0, 0, view.itemId).setOrigin(0.5, 1).setScale(1 / FURN_SCALE));
    } else {
      parts.push(this.add.rectangle(0, -def.h / 2, def.w, def.h, hexColor(def.color), 1).setStrokeStyle(2, 0x000000, 0.35));
    }
    const c = this.add.container(view.x, view.y, parts).setDepth(view.y);
    this.furnitureObjs.set(view.id, c);
  }
  private onFurnitureRemove(id: string) {
    this.furnitureObjs.get(id)?.destroy();
    this.furnitureObjs.delete(id);
  }

  // ---- input ---------------------------------------------------------------
  private clampToBounds(x: number, y: number) {
    return {
      x: Phaser.Math.Clamp(x, this.bounds.x, this.bounds.x + this.bounds.width),
      y: Phaser.Math.Clamp(y, this.bounds.y, this.bounds.y + this.bounds.height),
    };
  }

  private hitPenguin(x: number, y: number): string | null {
    for (const [id, p] of this.penguins) {
      if (Math.abs(x - p.x) < 28 && y < p.y + 8 && y > p.y - 68) return id;
    }
    return null;
  }

  private hitFurniture(x: number, y: number): string | null {
    for (const [id, view] of game.furniture) {
      const def = FURNITURE_BY_ID[view.itemId];
      if (!def) continue;
      const r = new Phaser.Geom.Rectangle(view.x - def.w / 2, view.y - def.h, def.w, def.h);
      if (r.contains(x, y)) return id;
    }
    return null;
  }

  private onPointer(x: number, y: number) {
    // collect a hidden pin
    for (const p of this.pinHits) {
      if (p.rect.contains(x, y)) { game.collectPin(p.id); return; }
    }

    // Igloo edit mode: place / remove furniture instead of walking.
    if (game.isIgloo && game.isIglooOwner && this.editMode) {
      const hit = this.hitFurniture(x, y);
      if (hit) { game.iglooRemove(hit); return; }
      if (this.selectedFurniture) {
        const c = this.clampToBounds(x, y);
        game.iglooPlace(this.selectedFurniture, c.x, c.y);
      }
      return;
    }

    // clicking another penguin opens their player card
    const pid = this.hitPenguin(x, y);
    if (pid && pid !== game.sessionId) {
      game.requestCard(pid);
      return;
    }

    // features take priority, then doors, then plain movement
    for (const f of this.features) {
      if (f.rect.contains(x, y)) {
        this.pending = { kind: "feature", ftype: f.type, id: f.id };
        this.moveSelf(f.x, f.y + 36);
        return;
      }
    }
    for (const d of this.doors) {
      if (d.rect.contains(x, y)) {
        this.pending = { kind: "door", toRoom: d.toRoom };
        this.moveSelf(d.rect.centerX, d.rect.bottom + 10);
        return;
      }
    }
    this.pending = null;
    const c = this.clampToBounds(x, y);
    this.moveSelf(c.x, c.y);
  }

  private moveSelf(x: number, y: number) {
    const self = this.penguins.get(game.sessionId);
    if (!self) return;
    const c = this.clampToBounds(x, y);
    self.setTarget(c.x, c.y);
    game.move(c.x, c.y);
  }

  // ---- igloo editor API (called from React) --------------------------------
  setEditMode(on: boolean) {
    this.editMode = on;
    if (!on) this.selectedFurniture = null;
  }
  setSelectedFurniture(id: string | null) {
    this.selectedFurniture = id;
  }

  // ---- main loop -----------------------------------------------------------
  update(time: number, delta: number) {
    this.penguins.forEach((p) => p.update(time, delta));

    // drifting water tiles
    for (const o of this.layout) {
      if (o instanceof Phaser.GameObjects.TileSprite) {
        const sc = o.getData("scroll") as number | undefined;
        if (sc) o.tilePositionX += sc * (delta / 16);
      }
    }

    if (this.pending) {
      const self = this.penguins.get(game.sessionId);
      if (self) {
        const dist = Math.hypot(self.targetX - self.x, self.targetY - self.y);
        if (dist < 3) {
          const action = this.pending;
          this.pending = null;
          this.runPending(action);
        }
      }
    }
  }

  private runPending(action: Pending) {
    if (!action) return;
    if (action.kind === "door") {
      game.joinRoom(action.toRoom);
    } else if (action.kind === "feature") {
      if (action.ftype === "shop") game.openShop();
      else if (action.ftype === "minigame") game.openMinigame(action.id ?? "coindash");
      else if (action.ftype === "igloo_entry") game.enterIgloo();
      else if (action.ftype === "petshop") game.openPuffleShop();
    }
  }
}
