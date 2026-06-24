import { useEffect, useRef } from "react";
import { drawPenguin, type OutfitLike } from "../game/penguinArt";

/** Live Canvas2D render of a penguin wearing the given outfit (Closet / Shop / card). */
export function PenguinPreview({
  outfit, puffleColor, size = 150,
}: { outfit: OutfitLike; puffleColor?: string; size?: number }) {
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
    ctx.clearRect(0, 0, size, size);
    drawPenguin(ctx, size / 2, size * 0.9, size / 105, outfit, puffleColor);
  }, [outfit.color, outfit.head, outfit.face, outfit.neck, outfit.body, outfit.hand, outfit.feet, puffleColor, size]);

  return <canvas ref={ref} style={{ width: size, height: size }} className="peng-preview" />;
}
