import { useEffect, useRef, useState } from "react";
import { game } from "../../net/GameClient";
import { MINIGAME_PAYOUTS } from "@shared";

const DURATION = 30; // seconds

interface Coin { x: number; y: number; vy: number; r: number; bomb: boolean; dead?: boolean; }

export function CoinDash({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const W = (canvas.width = 640);
    const H = (canvas.height = 420);
    const PW = 96;

    let paddleX = W / 2;
    let coins: Coin[] = [];
    let score = 0;
    let timeLeft = DURATION;
    let spawnAcc = 0;
    let last = performance.now();
    let raf = 0;
    let finished = false;

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      paddleX = (e.clientX - r.left) * (W / r.width);
    };
    canvas.addEventListener("pointermove", onMove);

    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
      setFinalScore(score);
      setDone(true);
      game.minigameResult("coindash", score);
    };

    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      timeLeft -= dt;

      spawnAcc += dt;
      const rate = 0.55;
      while (spawnAcc > rate) {
        spawnAcc -= rate;
        coins.push({
          x: 30 + Math.random() * (W - 60),
          y: -20,
          vy: 120 + Math.random() * 160,
          r: 15,
          bomb: Math.random() < 0.15,
        });
      }

      const py = H - 40;
      for (const c of coins) {
        c.y += c.vy * dt;
        if (!c.dead && c.y > py - 16 && c.y < py + 24 && Math.abs(c.x - paddleX) < PW / 2 + c.r) {
          c.dead = true;
          score = c.bomb ? Math.max(0, score - 5) : score + 1;
        }
      }
      coins = coins.filter((c) => !c.dead && c.y < H + 30);

      // draw
      ctx.fillStyle = "#0d2436";
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,.08)";
      for (let i = 0; i < W; i += 32) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }

      for (const c of coins) {
        ctx.beginPath();
        ctx.fillStyle = c.bomb ? "#e74c3c" : "#f5c542";
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c.bomb ? "#fff" : "#8a5a00";
        ctx.font = "bold 16px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(c.bomb ? "✖" : "$", c.x, c.y + 1);
      }

      // paddle
      ctx.fillStyle = "#7fd1ff";
      ctx.beginPath();
      (ctx as any).roundRect?.(paddleX - PW / 2, py, PW, 18, 8);
      ctx.fill();
      if (!(ctx as any).roundRect) ctx.fillRect(paddleX - PW / 2, py, PW, 18);

      // hud
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText(`🪙 ${score}`, 14, 26);
      ctx.textAlign = "right";
      ctx.fillText(`⏱ ${Math.max(0, Math.ceil(timeLeft))}s`, W - 14, 26);

      if (timeLeft <= 0) { finish(); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointermove", onMove);
    };
  }, [round]);

  const payout = MINIGAME_PAYOUTS.coindash;

  return (
    <div className="modal-backdrop">
      <div className="modal minigame-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>🎮 Coin Dash</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="minigame-body">
          <canvas ref={canvasRef} className="minigame-canvas" />
          {!done ? (
            <p className="hint">Move your mouse to catch <b>$</b> coins. Avoid the <b>✖</b> bombs!</p>
          ) : (
            <div className="minigame-result">
              <h3>Time's up!</h3>
              <p>You scored <strong>{finalScore}</strong> — earned up to <strong>🪙 {Math.min(payout.max, finalScore * payout.perScore)}</strong> coins!</p>
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
