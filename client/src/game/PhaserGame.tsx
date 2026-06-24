import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { WORLD_W, WORLD_H } from "@shared";
import { WorldScene } from "./scenes/WorldScene";
import { RENDER_SCALE } from "./render";

export function PhaserGame() {
  const parentRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (gameRef.current || !parentRef.current) return;
    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: parentRef.current,
      // Backing store is supersampled; the canvas is still displayed at the world
      // viewport size via Scale.FIT, so text/detail render crisp (see render.ts).
      width: WORLD_W * RENDER_SCALE,
      height: WORLD_H * RENDER_SCALE,
      backgroundColor: "#2b3a67",
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      pixelArt: true,
      render: { roundPixels: true },
      scene: [WorldScene],
    });
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div className="phaser-root" ref={parentRef} />;
}
