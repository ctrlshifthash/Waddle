import { useEffect, useRef, useState } from "react";
import { game } from "../../net/GameClient";

const DURATION = 60; // seconds
const START_LIVES = 3;

interface Critter {
  x: number;
  y: number;
  vx: number;
  r: number;
  jelly: boolean;
  dead?: boolean;
}

export function IceFishing({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    const canvas: HTMLCanvasElement = canvasRef.current!;
    const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
    const W = (canvas.width = 640);
    const H = (canvas.height = 420);
    const WATER_TOP = 70; // surface of the water (ice line)
    const HOOK_LEN = 220; // how far the line dangles down
    const HOOK_R = 12; // hook hit radius

    let hookX = W / 2;
    const hookY = WATER_TOP + HOOK_LEN;
    let critters: Critter[] = [];
    let score = 0;
    let lives = START_LIVES;
    let timeLeft = DURATION;
    let spawnAcc = 0;
    let last = performance.now();
    let raf = 0;
    let finished = false;

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      hookX = (e.clientX - r.left) * (W / r.width);
      hookX = Math.max(20, Math.min(W - 20, hookX));
    };
    canvas.addEventListener("pointermove", onMove);

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      setFinalScore(score);
      setDone(true);
      game.minigameResult("icefishing", score);
    };

    const spawn = () => {
      const fromLeft = Math.random() < 0.5;
      const jelly = Math.random() < 0.3;
      const r = jelly ? 16 : 18;
      const speed = (60 + Math.random() * 120) * (jelly ? 1.1 : 1);
      const depth = WATER_TOP + 40 + Math.random() * (H - WATER_TOP - 70);
      critters.push({
        x: fromLeft ? -30 : W + 30,
        y: depth,
        vx: fromLeft ? speed : -speed,
        r,
        jelly,
      });
    };

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      timeLeft -= dt;

      spawnAcc += dt;
      const rate = 0.6;
      while (spawnAcc > rate) {
        spawnAcc -= rate;
        spawn();
      }

      for (const c of critters) {
        c.x += c.vx * dt;
        if (
          !c.dead &&
          Math.abs(c.x - hookX) < c.r + HOOK_R &&
          Math.abs(c.y - hookY) < c.r + HOOK_R
        ) {
          c.dead = true;
          if (c.jelly) {
            lives = Math.max(0, lives - 1);
          } else {
            score += 1;
          }
        }
      }
      critters = critters.filter((c) => !c.dead && c.x > -50 && c.x < W + 50);

      // ---- draw ----
      // sky / ice above the water
      ctx.fillStyle = "#dff2fb";
      ctx.fillRect(0, 0, W, WATER_TOP);
      // water
      const grad = ctx.createLinearGradient(0, WATER_TOP, 0, H);
      grad.addColorStop(0, "#1b6ca8");
      grad.addColorStop(1, "#0a2f4d");
      ctx.fillStyle = grad;
      ctx.fillRect(0, WATER_TOP, W, H - WATER_TOP);
      // surface line
      ctx.strokeStyle = "rgba(255,255,255,.6)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, WATER_TOP);
      ctx.lineTo(W, WATER_TOP);
      ctx.stroke();
      ctx.lineWidth = 1;

      // fishing line + hook
      ctx.strokeStyle = "#f4f4f4";
      ctx.beginPath();
      ctx.moveTo(hookX, 0);
      ctx.lineTo(hookX, hookY);
      ctx.stroke();
      ctx.strokeStyle = "#cfd8dc";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(hookX, hookY, HOOK_R * 0.7, Math.PI * 0.1, Math.PI * 1.4);
      ctx.stroke();
      ctx.lineWidth = 1;

      // critters
      for (const c of critters) {
        ctx.beginPath();
        ctx.fillStyle = c.jelly ? "#a45ee5" : "#ff8c2b";
        if (c.jelly) {
          // jellyfish: dome + tentacles
          ctx.arc(c.x, c.y, c.r, Math.PI, 0);
          ctx.fill();
          ctx.strokeStyle = "#c89bf0";
          ctx.beginPath();
          for (let i = -2; i <= 2; i++) {
            const tx = c.x + i * (c.r / 2.5);
            ctx.moveTo(tx, c.y);
            ctx.lineTo(tx, c.y + c.r * 0.9);
          }
          ctx.stroke();
        } else {
          // fish: body + tail (tail points opposite of travel)
          ctx.ellipse(c.x, c.y, c.r, c.r * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          const dir = c.vx >= 0 ? 1 : -1;
          ctx.beginPath();
          ctx.fillStyle = "#e06d12";
          ctx.moveTo(c.x - dir * c.r, c.y);
          ctx.lineTo(c.x - dir * (c.r + c.r * 0.8), c.y - c.r * 0.5);
          ctx.lineTo(c.x - dir * (c.r + c.r * 0.8), c.y + c.r * 0.5);
          ctx.closePath();
          ctx.fill();
          // eye
          ctx.beginPath();
          ctx.fillStyle = "#fff";
          ctx.arc(c.x + dir * c.r * 0.45, c.y - c.r * 0.18, c.r * 0.18, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ---- HUD ----
      ctx.fillStyle = "#0d2436";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText(`🐟 ${score}`, 14, 30);
      ctx.textAlign = "center";
      ctx.fillText(`${"❤".repeat(lives)}${"🖤".repeat(START_LIVES - lives)}`, W / 2, 30);
      ctx.textAlign = "right";
      ctx.fillText(`⏱ ${Math.max(0, Math.ceil(timeLeft))}s`, W - 14, 30);

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
          <h2>🎣 Ice Fishing</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="minigame-body">
          <canvas ref={canvasRef} className="minigame-canvas" />
          {!done ? (
            <p className="hint">
              Move your mouse to steer the hook. Catch <b>orange fish</b> (+1), avoid the{" "}
              <b>purple jellyfish</b> (−1 life)!
            </p>
          ) : (
            <div className="minigame-result">
              <h3>Reeled in!</h3>
              <p>
                You caught <strong>{finalScore}</strong> fish!
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
                <button className="btn btn-ghost" onClick={onClose}>Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
