import { useEffect, useRef, useState } from "react";
import { game } from "../../net/GameClient";
import { MINIGAME_PAYOUTS } from "@shared";

const DURATION = 60; // seconds
const MAX_SHOTS = 20;

interface Target { x: number; y: number; w: number; h: number; vx: number; dead?: boolean; }
interface Bullet { x: number; y: number; vy: number; dead?: boolean; }

export function AstroBarrier({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    const canvas: HTMLCanvasElement = canvasRef.current!;
    const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
    const W = (canvas.width = 640);
    const H = (canvas.height = 420);
    const SHIP_W = 44;
    const SHIP_H = 22;
    const shipY = H - 34;

    let shipX = W / 2;
    let bullets: Bullet[] = [];
    let score = 0;
    let shotsLeft = MAX_SHOTS;
    let timeLeft = DURATION;
    let last = performance.now();
    let raf = 0;
    let finished = false;

    // Build rows of targets that drift left-right.
    const targets: Target[] = [];
    const rows = 3;
    const perRow = 6;
    const tSize = 22;
    for (let r = 0; r < rows; r++) {
      const dir = r % 2 === 0 ? 1 : -1;
      const speed = 70 + r * 35;
      for (let c = 0; c < perRow; c++) {
        targets.push({
          x: 60 + c * ((W - 120) / (perRow - 1)) - tSize / 2,
          y: 50 + r * 46,
          w: tSize,
          h: tSize,
          vx: dir * speed,
        });
      }
    }

    const onMove = (e: PointerEvent): void => {
      const rect = canvas.getBoundingClientRect();
      shipX = (e.clientX - rect.left) * (W / rect.width);
      shipX = Math.max(SHIP_W / 2, Math.min(W - SHIP_W / 2, shipX));
    };

    const fire = (): void => {
      if (finished || shotsLeft <= 0) return;
      // Only one active bullet on screen at a time (classic Astro Barrier feel).
      if (bullets.some((b) => !b.dead)) return;
      shotsLeft -= 1;
      bullets.push({ x: shipX, y: shipY - SHIP_H, vy: -520 });
    };

    const onDown = (e: PointerEvent): void => {
      const rect = canvas.getBoundingClientRect();
      shipX = (e.clientX - rect.left) * (W / rect.width);
      shipX = Math.max(SHIP_W / 2, Math.min(W - SHIP_W / 2, shipX));
      fire();
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);

    const finish = (): void => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      setFinalScore(score);
      setDone(true);
      game.minigameResult("astrobarrier", score);
    };

    const loop = (t: number): void => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      timeLeft -= dt;

      // Move targets, bounce at edges.
      for (const tg of targets) {
        if (tg.dead) continue;
        tg.x += tg.vx * dt;
        if (tg.x < 20) { tg.x = 20; tg.vx = Math.abs(tg.vx); }
        if (tg.x + tg.w > W - 20) { tg.x = W - 20 - tg.w; tg.vx = -Math.abs(tg.vx); }
      }

      // Move bullets, collide.
      for (const b of bullets) {
        if (b.dead) continue;
        b.y += b.vy * dt;
        if (b.y < -10) { b.dead = true; continue; }
        for (const tg of targets) {
          if (tg.dead) continue;
          if (b.x >= tg.x && b.x <= tg.x + tg.w && b.y >= tg.y && b.y <= tg.y + tg.h) {
            tg.dead = true;
            b.dead = true;
            score += 1;
            break;
          }
        }
      }
      bullets = bullets.filter((b) => !b.dead);

      // draw
      ctx.fillStyle = "#06121f";
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,.5)";
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97) % W;
        const sy = (i * 53) % H;
        ctx.fillRect(sx, sy, 2, 2);
      }

      // targets
      for (const tg of targets) {
        if (tg.dead) continue;
        ctx.fillStyle = "#3df0c0";
        ctx.fillRect(tg.x, tg.y, tg.w, tg.h);
        ctx.fillStyle = "#0a4f40";
        ctx.fillRect(tg.x + 5, tg.y + 5, tg.w - 10, tg.h - 10);
      }

      // bullets
      ctx.fillStyle = "#ffd23f";
      for (const b of bullets) {
        ctx.fillRect(b.x - 2, b.y - 8, 4, 14);
      }

      // ship
      ctx.fillStyle = "#7fd1ff";
      ctx.beginPath();
      ctx.moveTo(shipX, shipY - SHIP_H);
      ctx.lineTo(shipX - SHIP_W / 2, shipY);
      ctx.lineTo(shipX + SHIP_W / 2, shipY);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(shipX - 3, shipY - SHIP_H + 4, 6, 8);

      // hud
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText(`🎯 ${score}`, 14, 26);
      ctx.textAlign = "center";
      ctx.fillText(`🔫 ${shotsLeft}`, W / 2, 26);
      ctx.textAlign = "right";
      ctx.fillText(`⏱ ${Math.max(0, Math.ceil(timeLeft))}s`, W - 14, 26);

      const allCleared = targets.every((tg) => tg.dead);
      const outOfShots = shotsLeft <= 0 && !bullets.some((b) => !b.dead);
      if (timeLeft <= 0 || outOfShots || allCleared) { finish(); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
    };
  }, [round]);

  const payout = MINIGAME_PAYOUTS.astrobarrier ?? { perScore: 20, max: 600, label: "Astro Barrier" };

  return (
    <div className="modal-backdrop">
      <div className="modal minigame-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>🚀 Astro Barrier</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="minigame-body">
          <canvas ref={canvasRef} className="minigame-canvas" />
          {!done ? (
            <p className="hint">Move your mouse to aim the ship, <b>click to fire</b>. Hit the targets — you have <b>{MAX_SHOTS}</b> shots!</p>
          ) : (
            <div className="minigame-result">
              <h3>Game over!</h3>
              <p>You hit <strong>{finalScore}</strong> targets — earned up to <strong>🪙 {Math.min(payout.max, finalScore * payout.perScore)}</strong> coins!</p>
              <div className="row">
                <button className="btn btn-primary" onClick={() => { setDone(false); setRound((r) => r + 1); }}>Play again</button>
                <button className="btn btn-ghost" onClick={onClose}>Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
