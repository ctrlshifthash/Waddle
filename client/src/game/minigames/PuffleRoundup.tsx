import { useEffect, useRef, useState } from "react";
import { game } from "../../net/GameClient";
import { MINIGAME_PAYOUTS } from "@shared";

const DURATION = 60; // seconds
const PUFFLE_COUNT = 8;

interface Puffle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  penned: boolean;
}

const COLORS = ["#e74c3c", "#3498db", "#f1c40f", "#2ecc71", "#9b59b6", "#e67e22", "#1abc9c", "#ff79c6"];

export function PuffleRoundup({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    const canvas: HTMLCanvasElement = canvasRef.current!;
    const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
    const W = (canvas.width = 640);
    const H = (canvas.height = 420);

    // Green pen in the bottom-right corner.
    const PEN_W = 150;
    const PEN_H = 120;
    const penX = W - PEN_W;
    const penY = H - PEN_H;

    const FLEE_RADIUS = 110; // distance at which puffles start fleeing
    const FLEE_FORCE = 320; // acceleration when fleeing
    const MAX_SPEED = 150;
    const WANDER = 90;

    let pointerX = -1000;
    let pointerY = -1000;
    let score = 0;
    let timeLeft = DURATION;
    let last = performance.now();
    let raf = 0;
    let finished = false;

    const puffles: Puffle[] = [];
    for (let i = 0; i < PUFFLE_COUNT; i++) {
      // Spawn puffles away from the pen so they have to be herded.
      const px = 40 + Math.random() * (W - PEN_W - 80);
      const py = 40 + Math.random() * (H - 80);
      const ang = Math.random() * Math.PI * 2;
      const spd = 40 + Math.random() * 50;
      puffles.push({
        x: px,
        y: py,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        r: 14,
        color: COLORS[i % COLORS.length],
        penned: false,
      });
    }

    const toCanvas = (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (W / rect.width),
        y: (clientY - rect.top) * (H / rect.height),
      };
    };

    const onMove = (e: PointerEvent) => {
      const p = toCanvas(e.clientX, e.clientY);
      pointerX = p.x;
      pointerY = p.y;
    };
    const onLeave = () => {
      pointerX = -1000;
      pointerY = -1000;
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
      setFinalScore(score);
      setDone(true);
      game.minigameResult("puffleroundup", score);
    };

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      timeLeft -= dt;

      for (const p of puffles) {
        if (p.penned) continue;

        // Random gentle wander.
        p.vx += (Math.random() - 0.5) * WANDER * dt;
        p.vy += (Math.random() - 0.5) * WANDER * dt;

        // Flee from pointer.
        const dx = p.x - pointerX;
        const dy = p.y - pointerY;
        const dist = Math.hypot(dx, dy);
        if (dist < FLEE_RADIUS && dist > 0.001) {
          const push = (FLEE_FORCE * (1 - dist / FLEE_RADIUS)) / dist;
          p.vx += dx * push * dt * 60 * 0.016;
          p.vy += dy * push * dt * 60 * 0.016;
        }

        // Clamp speed.
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > MAX_SPEED) {
          p.vx = (p.vx / sp) * MAX_SPEED;
          p.vy = (p.vy / sp) * MAX_SPEED;
        }

        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Bounce off walls.
        if (p.x < p.r) { p.x = p.r; p.vx = Math.abs(p.vx); }
        if (p.x > W - p.r) { p.x = W - p.r; p.vx = -Math.abs(p.vx); }
        if (p.y < p.r) { p.y = p.r; p.vy = Math.abs(p.vy); }
        if (p.y > H - p.r) { p.y = H - p.r; p.vy = -Math.abs(p.vy); }

        // Captured when fully inside the pen.
        if (
          p.x - p.r >= penX &&
          p.x + p.r <= W &&
          p.y - p.r >= penY &&
          p.y + p.r <= H
        ) {
          p.penned = true;
          score += 1;
        }
      }

      // ---- draw ----
      ctx.fillStyle = "#0d2436";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,.08)";
      for (let i = 0; i < W; i += 32) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, H);
        ctx.stroke();
      }

      // Pen.
      ctx.fillStyle = "rgba(46,204,113,.18)";
      ctx.fillRect(penX, penY, PEN_W, PEN_H);
      ctx.strokeStyle = "#2ecc71";
      ctx.lineWidth = 4;
      ctx.strokeRect(penX, penY, PEN_W, PEN_H);
      ctx.lineWidth = 1;
      ctx.fillStyle = "#2ecc71";
      ctx.font = "bold 14px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("PEN", penX + PEN_W / 2, penY + 14);

      // Pointer indicator (herding zone).
      if (pointerX > -500) {
        ctx.beginPath();
        ctx.strokeStyle = "rgba(127,209,255,.35)";
        ctx.arc(pointerX, pointerY, FLEE_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = "#7fd1ff";
        ctx.arc(pointerX, pointerY, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Puffles.
      for (const p of puffles) {
        if (p.penned) continue;
        ctx.beginPath();
        ctx.fillStyle = p.color;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        // Eyes.
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(p.x - 4, p.y - 3, 3, 0, Math.PI * 2);
        ctx.arc(p.x + 4, p.y - 3, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#0d2436";
        ctx.beginPath();
        ctx.arc(p.x - 4, p.y - 3, 1.4, 0, Math.PI * 2);
        ctx.arc(p.x + 4, p.y - 3, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // HUD.
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText(`🐾 ${score}/${PUFFLE_COUNT}`, 14, 28);
      ctx.textAlign = "right";
      ctx.fillText(`⏱ ${Math.max(0, Math.ceil(timeLeft))}s`, W - 14, 28);

      if (timeLeft <= 0 || score >= PUFFLE_COUNT) {
        finish();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [round]);

  const payout = MINIGAME_PAYOUTS.puffleroundup ?? { perScore: 5, max: 600, label: "Puffle Roundup" };

  return (
    <div className="modal-backdrop">
      <div className="modal minigame-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>🐾 Puffle Roundup</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="minigame-body">
          <canvas ref={canvasRef} className="minigame-canvas" />
          {!done ? (
            <p className="hint">Move your mouse near the puffles to scare them — herd them into the green <b>pen</b>!</p>
          ) : (
            <div className="minigame-result">
              <h3>{finalScore >= PUFFLE_COUNT ? "All penned! 🎉" : "Time's up!"}</h3>
              <p>You penned <strong>{finalScore}</strong> puffles — earned up to <strong>🪙 {Math.min(payout.max, finalScore * payout.perScore)}</strong> coins!</p>
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
