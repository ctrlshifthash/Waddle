import { useEffect, useRef, useState } from "react";
import { game } from "../../net/GameClient";

const DURATION = 60; // seconds
const START_LIVES = 3;

interface FallingItem {
  x: number;
  y: number;
  vy: number;
  size: number;
  anvil: boolean;
  dead?: boolean;
}

export function BeanCounters({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    const canvas: HTMLCanvasElement = canvasRef.current!;
    const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
    const W: number = (canvas.width = 640);
    const H: number = (canvas.height = 420);
    const CART_W = 100;
    const CART_H = 26;

    let cartX: number = W / 2;
    let items: FallingItem[] = [];
    let score = 0;
    let lives = START_LIVES;
    let timeLeft = DURATION;
    let spawnAcc = 0;
    let last = performance.now();
    let raf = 0;
    let finished = false;

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      cartX = (e.clientX - r.left) * (W / r.width);
    };
    canvas.addEventListener("pointermove", onMove);

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      setFinalScore(score);
      setDone(true);
      game.minigameResult("beancounters", score);
    };

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      timeLeft -= dt;

      spawnAcc += dt;
      const rate = 0.7;
      while (spawnAcc > rate) {
        spawnAcc -= rate;
        const anvil = Math.random() < 0.2;
        const size = anvil ? 34 : 26;
        items.push({
          x: 24 + Math.random() * (W - 48),
          y: -size,
          vy: 130 + Math.random() * 150,
          size,
          anvil,
        });
      }

      const cartY = H - 44;
      const halfCart = CART_W / 2;
      if (cartX < halfCart) cartX = halfCart;
      if (cartX > W - halfCart) cartX = W - halfCart;

      for (const it of items) {
        it.y += it.vy * dt;
        const bottom = it.y + it.size / 2;
        if (
          !it.dead &&
          bottom > cartY - 6 &&
          bottom < cartY + CART_H &&
          Math.abs(it.x - cartX) < halfCart + it.size / 2
        ) {
          it.dead = true;
          if (it.anvil) lives -= 1;
          else score += 1;
        }
      }
      items = items.filter((it) => !it.dead && it.y < H + 40);

      // background
      ctx.fillStyle = "#0d2436";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,.08)";
      for (let i = 0; i < W; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, H);
        ctx.stroke();
      }

      // falling items
      for (const it of items) {
        const half = it.size / 2;
        if (it.anvil) {
          ctx.fillStyle = "#8a8f99";
          ctx.fillRect(it.x - half, it.y - half, it.size, it.size);
          ctx.fillStyle = "#5b6068";
          ctx.fillRect(it.x - half, it.y - half, it.size, it.size / 3);
          ctx.fillStyle = "#cfd3da";
          ctx.font = "bold 16px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("⚓", it.x, it.y + 1);
        } else {
          ctx.fillStyle = "#7a4a1d";
          ctx.fillRect(it.x - half, it.y - half, it.size, it.size);
          ctx.fillStyle = "#a9692e";
          ctx.fillRect(it.x - half + 3, it.y - half + 3, it.size - 6, it.size - 6);
          ctx.fillStyle = "#f0e0c0";
          ctx.font = "bold 13px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("☕", it.x, it.y + 1);
        }
      }

      // cart / penguin
      ctx.fillStyle = "#7fd1ff";
      const cx = cartX - halfCart;
      if ((ctx as unknown as { roundRect?: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect) {
        ctx.beginPath();
        (ctx as unknown as { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(cx, cartY, CART_W, CART_H, 8);
        ctx.fill();
      } else {
        ctx.fillRect(cx, cartY, CART_W, CART_H);
      }
      ctx.fillStyle = "#1d3450";
      ctx.beginPath();
      ctx.arc(cx + 22, cartY + CART_H, 9, 0, Math.PI * 2);
      ctx.arc(cx + CART_W - 22, cartY + CART_H, 9, 0, Math.PI * 2);
      ctx.fill();

      // HUD
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText(`☕ ${score}`, 14, 26);
      ctx.textAlign = "center";
      ctx.fillText(`${"❤".repeat(Math.max(0, lives))}${"·".repeat(Math.max(0, START_LIVES - lives))}`, W / 2, 26);
      ctx.textAlign = "right";
      ctx.fillText(`⏱ ${Math.max(0, Math.ceil(timeLeft))}s`, W - 14, 26);

      if (timeLeft <= 0 || lives <= 0) {
        finish();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
    };
  }, [round]);

  return (
    <div className="modal-backdrop">
      <div className="modal minigame-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>🫘 Bean Counters</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="minigame-body">
          <canvas ref={canvasRef} className="minigame-canvas" />
          {!done ? (
            <p className="hint">
              Move your mouse to catch falling <b>☕ coffee bags</b> (+1). Dodge the heavy <b>⚓ anvils</b> — each one costs a life!
            </p>
          ) : (
            <div className="minigame-result">
              <h3>Shift over!</h3>
              <p>
                You bagged <strong>{finalScore}</strong> coffee bags!
              </p>
              <div className="row">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setDone(false);
                    setRound((r) => r + 1);
                  }}
                >
                  Play again
                </button>
                <button className="btn btn-ghost" onClick={onClose}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
