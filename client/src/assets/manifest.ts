// ============================================================================
// ASSET MANIFEST — the single place to swap placeholder art for real sprites.
//
// Right now the game renders procedurally (see game/gfx.ts) so it runs with ZERO
// image files. When you have penguin / clothing / room art, do this:
//
//   1. Drop image files in client/public/sprites/...  (served at /sprites/...).
//   2. Fill in the maps below (itemId / furnitureId / roomId -> file path).
//   3. In WorldScene.preload() load them, e.g.:
//        for (const [key, path] of Object.entries(SPRITES)) this.load.image(key, path);
//   4. In game/Penguin.ts, prefer a sprite texture key over the "acc_*"/"peng_*"
//      placeholders when one exists for the equipped item.
//
// The catalogs (shared/items.ts) and all game logic stay unchanged — only the
// texture lookup changes — so importing sprites later is non-breaking.
// ============================================================================

/** itemId -> texture key (and the file each key loads from). */
export const ITEM_SPRITES: Record<string, string> = {
  // color_red: "peng_color_red",
  // head_tophat: "clothing_tophat",
};

export const FURNITURE_SPRITES: Record<string, string> = {
  // f_sofa: "furn_sofa",
};

// roomId -> background image served from client/public. Drop a real PNG/JPG (or
// keep the demo SVG) here and that room renders the painted backdrop instead of
// the procedural scenery. (Supports .svg / .png / .jpg.)
export const ROOM_BACKGROUNDS: Record<string, string> = {
  // town: "/sprites/rooms/town.svg",  // (demo painted bg; rooms now use tilesets)
};

/** texture key -> file path, loaded in WorldScene.preload() once populated. */
export const SPRITES: Record<string, string> = {
  // peng_color_red: "/sprites/penguin/red.png",
  // clothing_tophat: "/sprites/clothing/tophat.png",
  // furn_sofa: "/sprites/furniture/sofa.png",
};

export const HAS_REAL_SPRITES = Object.keys(SPRITES).length > 0;
