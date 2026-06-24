import { useEffect, useRef, useState } from "react";
import { game } from "../../net/GameClient";

const DURATION = 60; // seconds
const START_LIVES = 3;

type ItemKind = "pepperoni" | "pepper" | "bomb";

interface Item {
  x: number;
  y: number;
  vy: number;
  r: number;
  kind: ItemKind;
  dead?: boolean;
}

export function Pizzatron({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    const canvas: HTMLCanvasElement = canvasRef.current!;
    const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
    const W = (canvas.width = 640);
    const H = (canvas.height = 420);
    const BASE_W = 110; // pizza base width
    const BASE_R = BASE_W / 2;

    let baseX = W / 2;
    let items: Item[] = [];
    let score = 0;
    let lives = START_LIVES;
    let timeLeft = DURATION;
    let spawnAcc = 0;
    let last = performance.now();
    let raf = 0;
    let finished = false;

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      baseX = (e.clientX - r.left) * (W / r.width);
      baseX = Math.max(BASE_R, Math.min(W - BASE_R, baseX));
    };
    canvas.addEventListener("pointermove", onMove);

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      setFinalScore(score);
      setDone(true);
      game.minigameResult("pizzatron", score);
    };

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      timeLeft -= dt;

      spawnAcc += dt;
      const rate = 0.5;
      while (spawnAcc > rate) {
        spawnAcc -= rate;
        const roll = Math.random();
        const kind: ItemKind = roll < 0.22 ? "bomb" : roll < 0.61 ? "pepper" : "pepperoni";
        items.push({
          x: 30 + Math.random() * (W - 60),
          y: -20,
          vy: 140 + Math.random() * 170,
          r: kind === "bomb" ? 16 : 13,
          kind,
        });
      }

      const py = H - 46; // pizza base top
      for (const it of items) {
        it.y += it.vy * dt;
        if (!it.dead && it.y > py - 18 && it.y < py + 22 && Math.abs(it.x - baseX) < BASE_R + it.r) {
          it.dead = true;
          if (it.kind === "bomb") {
            lives = Math.max(0, lives - 1);
          } else {
            score += 1;
          }
        }
      }
      items = items.filter((it) => !it.dead && it.y < H + 30);

      // draw background / conveyor
      ctx.fillStyle = "#2a1a10";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,200,120,.10)";
      for (let i = 0; i < W; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, H);
        ctx.stroke();
      }
      // conveyor belt strip near bottom
      ctx.fillStyle = "#3b2a1c";
      ctx.fillRect(0, py + 14, W, H - (py + 14));

      // falling items
      for (const it of items) {
        ctx.beginPath();
        if (it.kind === "pepperoni") ctx.fillStyle = "#d4453a";
        else if (it.kind === "pepper") ctx.fillStyle = "#3bb24a";
        else ctx.fillStyle = "#1b1b1b";
        ctx.arc(it.x, it.y, it.r, 0, Math.PI * 2);
        ctx.fill();
        if (it.kind === "bomb") {
          ctx.fillStyle = "#ff5252";
          ctx.font = "bold 16px system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("✖", it.x, it.y + 1);
        }
      }

      // pizza base (semi-circle dough)
      ctx.fillStyle = "#e8c87a";
      ctx.beginPath();
      ctx.arc(baseX, py + 12, BASE_R, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = "#c9362b";
      ctx.beginPath();
      ctx.arc(baseX, py + 12, BASE_R - 8, Math.PI, 0);
      ctx.fill();

      // hud
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText(`🍕 ${score}`, 14, 26);
      ctx.textAlign = "center";
      ctx.fillText(`❤ ${lives}`, W / 2, 26);
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
          <h2>🍕 Pizzatron 3000</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="minigame-body">
          <canvas ref={canvasRef} className="minigame-canvas" />
          {!done ? (
            <p className="hint">
              Move your mouse to slide the pizza base. Catch <b>pepperoni</b> &amp; <b>peppers</b> — dodge the <b>✖</b> bombs!
            </p>
          ) : (
            <div className="minigame-result">
              <h3>Order up!</h3>
              <p>
                You topped <strong>{finalScore}</strong> pizzas!
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
