import { useEffect, useRef, useState } from "react";
import { game } from "../../net/GameClient";
import { MINIGAME_PAYOUTS } from "@shared";

const DURATION = 60; // seconds

interface Obstacle { x: number; y: number; kind: "log" | "buoy"; w: number; h: number; r: number; dead?: boolean; }
interface Ring { x: number; y: number; r: number; passed?: boolean; dead?: boolean; }

export function HydroHopper({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const [crashed, setCrashed] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    const canvas: HTMLCanvasElement = canvasRef.current!;
    const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
    const W = (canvas.width = 640);
    const H = (canvas.height = 420);
    const PX = 80; // penguin x (left side)
    const PR = 18; // penguin collision radius

    let penguinY = H / 2;
    let obstacles: Obstacle[] = [];
    let rings: Ring[] = [];
    let score = 0;
    let timeLeft = DURATION;
    let obsAcc = 0;
    let ringAcc = 0;
    let scroll = 0;
    let last = performance.now();
    let raf = 0;
    let finished = false;
    let didCrash = false;

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      penguinY = (e.clientY - r.top) * (H / r.height);
      penguinY = Math.max(PR + 30, Math.min(H - PR, penguinY));
    };
    canvas.addEventListener("pointermove", onMove);

    const finish = (wasCrash: boolean) => {
      if (finished) return;
      finished = true;
      didCrash = wasCrash;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      setFinalScore(score);
      setCrashed(wasCrash);
      setDone(true);
      game.minigameResult("hydrohopper", score);
    };

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      timeLeft -= dt;

      // speed ramps up over time
      const elapsed = DURATION - timeLeft;
      const speed = 200 + elapsed * 6; // px/sec, scrolling right -> left
      scroll += speed * dt;

      // spawn obstacles
      obsAcc += dt;
      const obsRate = Math.max(0.45, 1.1 - elapsed * 0.012);
      while (obsAcc > obsRate) {
        obsAcc -= obsRate;
        const isLog = Math.random() < 0.55;
        if (isLog) {
          const h = 22;
          obstacles.push({ x: W + 40, y: 40 + Math.random() * (H - 80), kind: "log", w: 70, h, r: 0 });
        } else {
          const r = 16;
          obstacles.push({ x: W + 40, y: 40 + Math.random() * (H - 80), kind: "buoy", w: 0, h: 0, r });
        }
      }

      // spawn rings
      ringAcc += dt;
      const ringRate = 0.9;
      while (ringAcc > ringRate) {
        ringAcc -= ringRate;
        rings.push({ x: W + 40, y: 50 + Math.random() * (H - 100), r: 22 });
      }

      // move + collide obstacles
      for (const o of obstacles) {
        o.x -= speed * dt;
        if (o.dead) continue;
        if (o.kind === "log") {
          const left = o.x - o.w / 2;
          const right = o.x + o.w / 2;
          const top = o.y - o.h / 2;
          const bottom = o.y + o.h / 2;
          const nx = Math.max(left, Math.min(PX, right));
          const ny = Math.max(top, Math.min(penguinY, bottom));
          const dx = PX - nx;
          const dy = penguinY - ny;
          if (dx * dx + dy * dy < PR * PR) { finish(true); return; }
        } else {
          const dx = PX - o.x;
          const dy = penguinY - o.y;
          const rr = PR + o.r;
          if (dx * dx + dy * dy < rr * rr) { finish(true); return; }
        }
      }
      obstacles = obstacles.filter((o) => o.x > -80);

      // move + collect rings
      for (const ring of rings) {
        ring.x -= speed * dt;
        if (ring.dead) continue;
        if (!ring.passed && ring.x <= PX) {
          ring.passed = true;
          const dy = Math.abs(penguinY - ring.y);
          if (dy < ring.r + PR) {
            score += 1;
            ring.dead = true;
          }
        }
      }
      rings = rings.filter((ring) => ring.x > -50 && !ring.dead);

      // ---- draw ----
      // water background
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#1b6ca8");
      grad.addColorStop(1, "#0a3a5c");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // wavy lines that scroll for motion
      ctx.strokeStyle = "rgba(255,255,255,.10)";
      ctx.lineWidth = 2;
      for (let y = 30; y < H; y += 40) {
        ctx.beginPath();
        for (let x = 0; x <= W; x += 16) {
          const yy = y + Math.sin((x + scroll) * 0.03) * 4;
          if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      ctx.lineWidth = 1;

      // rings (yellow)
      for (const ring of rings) {
        ctx.beginPath();
        ctx.strokeStyle = "#f5c542";
        ctx.lineWidth = 5;
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      }

      // obstacles
      for (const o of obstacles) {
        if (o.kind === "log") {
          ctx.fillStyle = "#7a4a1e";
          (ctx as any).roundRect?.(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, 8);
          if ((ctx as any).roundRect) { ctx.beginPath(); (ctx as any).roundRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, 8); ctx.fill(); }
          else ctx.fillRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h);
          ctx.strokeStyle = "#4d2e12";
          ctx.beginPath();
          ctx.ellipse(o.x - o.w / 2 + 6, o.y, 5, o.h / 2 - 3, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.fillStyle = "#e74c3c";
          ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.fillRect(o.x - o.r, o.y - 2, o.r * 2, 4);
        }
      }

      // penguin + wake
      ctx.strokeStyle = "rgba(255,255,255,.5)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(PX - PR, penguinY + PR);
      ctx.lineTo(PX - PR - 36, penguinY + PR + 10);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.fillStyle = "#222";
      ctx.arc(PX, penguinY, PR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = "#fff";
      ctx.arc(PX + 2, penguinY + 3, PR * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = "#f5a623";
      ctx.moveTo(PX + PR - 2, penguinY - 2);
      ctx.lineTo(PX + PR + 8, penguinY);
      ctx.lineTo(PX + PR - 2, penguinY + 4);
      ctx.closePath();
      ctx.fill();

      // hud
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText(`💍 ${score}`, 14, 26);
      ctx.textAlign = "right";
      ctx.fillText(`⏱ ${Math.max(0, Math.ceil(timeLeft))}s`, W - 14, 26);

      if (timeLeft <= 0) { finish(false); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      void didCrash;
    };
  }, [round]);

  const payout = MINIGAME_PAYOUTS.hydrohopper ?? { perScore: 5, max: 600, label: "Hydro Hopper" };

  return (
    <div className="modal-backdrop">
      <div className="modal minigame-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>🌊 Hydro Hopper</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="minigame-body">
          <canvas ref={canvasRef} className="minigame-canvas" />
          {!done ? (
            <p className="hint">Move your mouse up/down to ski. Pass through <b>yellow rings</b> for points and dodge the <b>logs</b> and <b>buoys</b>!</p>
          ) : (
            <div className="minigame-result">
              <h3>{crashed ? "Splash! You crashed." : "Time's up!"}</h3>
              <p>You scored <strong>{finalScore}</strong> — earned up to <strong>🪙 {Math.min(payout.max, finalScore * payout.perScore)}</strong> coins!</p>
              <div className="row">
                <button className="btn btn-primary" onClick={() => { setDone(false); setCrashed(false); setRound((r) => r + 1); }}>Play again</button>
                <button className="btn btn-ghost" onClick={onClose}>Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
