import Phaser from "phaser";
import { ITEM_ART, FURNITURE_ART } from "./penguinArt";

/** Furniture art is baked at this multiple of its catalog size so it stays crisp
 *  when the camera zooms in; the world sprite is then drawn at 1/FURN_SCALE. */
export const FURN_SCALE = 3;

// Procedurally-generated placeholder art so the game is fully playable with zero
// image assets. To use real sprites later, load them in a Phaser preload and map
// item ids -> texture keys in assets/manifest.ts.

const WHITE = 0xffffff;
const BELLY = 0xeef4fb;
const ORANGE = 0xf5a623;
const ORANGE_D = 0xd6850f;
const OUTLINE = 0x16202b;
const DARK = 0x222831;

export function ensureTextures(scene: Phaser.Scene) {
  if (scene.textures.exists("peng_body")) return;

  const mk = (key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  // body: white blob with a soft outline
  mk("peng_body", 56, 64, (g) => {
    g.fillStyle(OUTLINE, 1); g.fillEllipse(28, 32, 52, 60);
    g.fillStyle(WHITE, 1); g.fillEllipse(28, 31, 46, 54);
  });
  // belly patch
  mk("peng_belly", 32, 40, (g) => { g.fillStyle(BELLY, 1); g.fillEllipse(16, 20, 27, 35); });
  // feet
  mk("peng_foot", 18, 11, (g) => {
    g.fillStyle(ORANGE_D, 1); g.fillEllipse(9, 6, 16, 9);
    g.fillStyle(ORANGE, 1); g.fillEllipse(9, 5, 14, 7);
  });
  // beak
  mk("peng_beak", 18, 13, (g) => {
    g.fillStyle(ORANGE_D, 1); g.fillTriangle(0, 1, 18, 1, 9, 12);
    g.fillStyle(ORANGE, 1); g.fillTriangle(2, 2, 16, 2, 9, 10);
  });
  // eye: white oval + dark pupil with a glint
  mk("peng_eye", 13, 16, (g) => {
    g.fillStyle(WHITE, 1); g.fillEllipse(6, 8, 11, 14);
    g.fillStyle(OUTLINE, 0.25); g.lineStyle?.(0, 0, 0);
    g.fillStyle(DARK, 1); g.fillCircle(7, 9, 3.4);
    g.fillStyle(WHITE, 1); g.fillCircle(8, 8, 1.1);
  });

  // distinct, recognizable clothing items (one texture per item id), baked from
  // the shared Canvas2D art so the world + previews match exactly.
  for (const [id, art] of Object.entries(ITEM_ART)) {
    if (scene.textures.exists(id)) continue;
    const canvas = document.createElement("canvas");
    canvas.width = art.w;
    canvas.height = art.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    art.draw(ctx);
    scene.textures.addCanvas(id, canvas);
  }

  // igloo furniture: one texture per id, baked at FURN_SCALE for crispness
  for (const [id, art] of Object.entries(FURNITURE_ART)) {
    if (scene.textures.exists(id)) continue;
    const canvas = document.createElement("canvas");
    canvas.width = art.w * FURN_SCALE;
    canvas.height = art.h * FURN_SCALE;
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.scale(FURN_SCALE, FURN_SCALE);
    art.draw(ctx);
    scene.textures.addCanvas(id, canvas);
  }

  // soft shadow under penguins
  mk("peng_shadow", 44, 18, (g) => { g.fillStyle(0x000000, 0.18); g.fillEllipse(22, 9, 40, 13); });

  // a small round puffle pet (tinted), for later
  mk("puffle", 30, 28, (g) => {
    g.fillStyle(OUTLINE, 1); g.fillEllipse(15, 16, 28, 24);
    g.fillStyle(WHITE, 1); g.fillEllipse(15, 15, 24, 20);
    g.fillStyle(DARK, 1); g.fillCircle(11, 13, 2.2); g.fillCircle(19, 13, 2.2);
  });
}

/** "#rrggbb" -> 0xrrggbb for Phaser tint. */
export function hexColor(s: string): number {
  if (!s) return 0xffffff;
  return parseInt(s.replace("#", ""), 16);
}
