import { useEffect, useRef } from "react";
import { drawItemIcon } from "../game/penguinArt";

/** Canvas icon of the actual item (clothing / furniture art, or a mini penguin for
 *  body colours) — replaces the old flat colour swatch in the shop, closet & editor. */
export function ItemIcon({ id, size = 56 }: { id: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = size * dpr;
    c.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawItemIcon(ctx, id, size);
  }, [id, size]);
  return <canvas ref={ref} style={{ width: size, height: size }} className="item-icon" />;
}
