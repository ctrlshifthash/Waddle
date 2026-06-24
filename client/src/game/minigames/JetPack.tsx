import { useEffect, useRef, useState } from "react";
import { game } from "../../net/GameClient";

const DURATION = 60; // seconds

interface Coin { x: number; y: number; r: number; dead?: boolean; }
interface Block { x: number; y: number; w: number; h: number; }

export function JetPack({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [crashed, setCrashed] = useState(false);

  useEffect(() => {
    const canvas: HTMLCanvasElement = canvasRef.current!;
    const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
    const W: number = (canvas.width = 640);
    const H: number = (canvas.height = 420);

    const PX: number = W / 3;       // penguin stays on left third
    const PR: number = 18;          // penguin radius
    const GRAVITY: number = 900;    // px/s^2 downward
    const THRUST: number = -1700;   // px/s^2 upward while held
    const MAX_VY: number = 520;     // terminal velocity clamp
    const SCROLL: number = 220;     // world scroll speed (px/s)

    let py: number = H / 2;
    let vy: number = 0;
    let thrusting: boolean = false;
    let coins: Coin[] = [];
    let blocks: Block[] = [];
    let score: number = 0;
    let timeLeft: number = DURATION;
    let coinAcc: number = 0;
    let blockAcc: number = 0;
    let flame: number = 0;
    let last: number = performance.now();
    let raf: number = 0;
    let finished: boolean = false;
    let didCrash: boolean = false;

    const press = (): void => { thrusting = true; };
    const release = (): void => { thrusting = false; };
    canvas.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);

    const finish = (crash: boolean): void => {
      if (finished) return;
      finished = true;
      didCrash = crash;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      setFinalScore(score);
      setCrashed(crash);
      setDone(true);
      game.minigameResult("jetpack", score);
    };

    const hitsBlock = (b: Block): boolean => {
      const nx: number = Math.max(b.x, Math.min(PX, b.x + b.w));
      const ny: number = Math.max(b.y, Math.min(py, b.y + b.h));
      const dx: number = PX - nx;
      const dy: number = py - ny;
      return dx * dx + dy * dy < PR * PR;
    };

    const loop = (t: number): void => {
      const dt: number = Math.min(0.05, (t - last) / 1000);
      last = t;
      timeLeft -= dt;
      flame += dt;

      // physics
      vy += (thrusting ? THRUST : GRAVITY) * dt;
      if (vy > MAX_VY) vy = MAX_VY;
      if (vy < -MAX_VY) vy = -MAX_VY;
      py += vy * dt;

      // crash on top/bottom edges
      if (py - PR <= 0 || py + PR >= H) {
        py = Math.max(PR, Math.min(H - PR, py));
        finish(true);
        return;
      }

      // spawn coins
      coinAcc += dt;
      const coinRate: number = 0.7;
      while (coinAcc > coinRate) {
        coinAcc -= coinRate;
        coins.push({ x: W + 30, y: 40 + Math.random() * (H - 80), r: 12 });
      }

      // spawn obstacle blocks
      blockAcc += dt;
      const blockRate: number = 1.1;
      while (blockAcc > blockRate) {
        blockAcc -= blockRate;
        const bh: number = 50 + Math.random() * 120;
        blocks.push({ x: W + 30, y: 20 + Math.random() * (H - 40 - bh), w: 26, h: bh });
      }

      // move + collide coins
      for (const c of coins) {
        c.x -= SCROLL * dt;
        if (!c.dead) {
          const dx: number = c.x - PX;
          const dy: number = c.y - py;
          if (dx * dx + dy * dy < (PR + c.r) * (PR + c.r)) {
            c.dead = true;
            score += 1;
          }
        }
      }
      coins = coins.filter((c) => !c.dead && c.x > -30);

      // move + collide blocks
      for (const b of blocks) {
        b.x -= SCROLL * dt;
        if (hitsBlock(b)) { finish(true); return; }
      }
      blocks = blocks.filter((b) => b.x + b.w > -10);

      // ---- draw ----
      ctx.fillStyle = "#0d2436";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,.08)";
      for (let i = 0; i < W; i += 32) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }

      // coins
      for (const c of coins) {
        ctx.beginPath();
        ctx.fillStyle = "#f5c542";
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#8a5a00";
        ctx.font = "bold 14px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("$", c.x, c.y + 1);
      }

      // obstacle blocks
      ctx.fillStyle = "#e74c3c";
      for (const b of blocks) {
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = "rgba(255,255,255,.25)";
        ctx.strokeRect(b.x, b.y, b.w, b.h);
      }

      // jetpack flame
      if (thrusting) {
        const fl: number = 10 + Math.abs(Math.sin(flame * 30)) * 10;
        ctx.beginPath();
        ctx.fillStyle = "#ffb02e";
        ctx.moveTo(PX - 6, py + PR);
        ctx.lineTo(PX + 6, py + PR);
        ctx.lineTo(PX, py + PR + fl);
        ctx.closePath();
        ctx.fill();
      }

      // jetpack (behind penguin)
      ctx.fillStyle = "#6c7a89";
      ctx.fillRect(PX - PR - 8, py - 10, 8, 22);

      // penguin body
      ctx.beginPath();
      ctx.fillStyle = "#1b1b1b";
      ctx.arc(PX, py, PR, 0, Math.PI * 2);
      ctx.fill();
      // belly
      ctx.beginPath();
      ctx.fillStyle = "#ffffff";
      ctx.arc(PX + 3, py + 2, PR - 7, 0, Math.PI * 2);
      ctx.fill();
      // beak
      ctx.beginPath();
      ctx.fillStyle = "#ffb02e";
      ctx.moveTo(PX + PR - 2, py - 3);
      ctx.lineTo(PX + PR + 8, py);
      ctx.lineTo(PX + PR - 2, py + 3);
      ctx.closePath();
      ctx.fill();
      // eye
      ctx.beginPath();
      ctx.fillStyle = "#000";
      ctx.arc(PX + 4, py - 6, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // hud
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText(`$ ${score}`, 14, 26);
      ctx.textAlign = "right";
      ctx.fillText(`${Math.max(0, Math.ceil(timeLeft))}s`, W - 14, 26);

      if (timeLeft <= 0) { finish(false); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      void didCrash;
    };
  }, [round]);

  return (
    <div className="modal-backdrop">
      <div className="modal minigame-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>🚀 Jet Pack Adventure</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="minigame-body">
          <canvas ref={canvasRef} className="minigame-canvas" />
          {!done ? (
            <p className="hint">Hold the mouse to <b>thrust up</b>, release to fall. Grab <b>$</b> coins and dodge the <b>red blocks</b> and walls!</p>
          ) : (
            <div className="minigame-result">
              <h3>{crashed ? "💥 Crashed!" : "Time's up!"}</h3>
              <p>You collected <strong>{finalScore}</strong> coins!</p>
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
