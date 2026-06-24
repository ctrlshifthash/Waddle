import { useEffect, useRef, useState } from "react";
import { game } from "../../net/GameClient";

interface Obstacle { x: number; w: number; gap: boolean; }
interface Gem { x: number; y: number; r: number; dead?: boolean; }

export function CartSurfer({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [finalDist, setFinalDist] = useState(0);

  useEffect(() => {
    const canvas: HTMLCanvasElement = canvasRef.current!;
    const ctx: CanvasRenderingContext2D = canvas.getContext("2d")!;
    const W: number = (canvas.width = 640);
    const H: number = (canvas.height = 420);

    const GROUND_Y: number = H - 70; // top surface of the track
    const CART_X: number = 130; // fixed horizontal position of the cart
    const CART_W: number = 46;
    const CART_H: number = 34;
    const GRAVITY: number = 2200; // px/s^2
    const JUMP_V: number = -780; // initial jump velocity

    let speed: number = 260; // px/s, scrolls left, ramps up
    let distance: number = 0; // world px travelled
    let gemCount: number = 0;
    let cartY: number = GROUND_Y - CART_H; // cart top
    let cartVy: number = 0;
    let onGround: boolean = true;
    let spawnAcc: number = 0; // world-distance accumulator for spawns
    let nextSpawnGap: number = 320; // world px until next obstacle
    let obstacles: Obstacle[] = [];
    let gems: Gem[] = [];
    let last: number = performance.now();
    let raf: number = 0;
    let finished: boolean = false;

    const scoreNow = (): number => Math.floor(distance / 50) + gemCount * 5;

    const jump = (): void => {
      if (onGround && !finished) {
        cartVy = JUMP_V;
        onGround = false;
      }
    };

    const onPointer = (e: PointerEvent): void => {
      e.preventDefault();
      jump();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        jump();
      }
    };
    canvas.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);

    const finish = (): void => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
      const s: number = scoreNow();
      setFinalScore(s);
      setFinalDist(Math.floor(distance));
      setDone(true);
      game.minigameResult("cartsurfer", s);
    };

    const loop = (t: number): void => {
      const dt: number = Math.min(0.05, (t - last) / 1000);
      last = t;

      // ramp difficulty
      speed += 6 * dt;
      const dx: number = speed * dt; // world px this frame
      distance += dx;

      // physics
      cartVy += GRAVITY * dt;
      cartY += cartVy * dt;
      const floorTop: number = GROUND_Y - CART_H;
      if (cartY >= floorTop) {
        cartY = floorTop;
        cartVy = 0;
        onGround = true;
      }

      // spawn obstacles spaced by world distance
      spawnAcc += dx;
      while (spawnAcc >= nextSpawnGap) {
        spawnAcc -= nextSpawnGap;
        const gap: boolean = Math.random() < 0.4;
        obstacles.push({
          x: W + 40,
          w: gap ? 70 + Math.random() * 50 : 26 + Math.random() * 20,
          gap,
        });
        // sometimes float a gem above the next stretch
        if (Math.random() < 0.6) {
          gems.push({
            x: W + 40 + (gap ? 200 : 120),
            y: GROUND_Y - 70 - Math.random() * 70,
            r: 11,
          });
        }
        nextSpawnGap = 280 + Math.random() * 220;
      }

      // move world objects
      for (const o of obstacles) o.x -= dx;
      for (const g of gems) g.x -= dx;
      obstacles = obstacles.filter((o) => o.x + o.w > -20);
      gems = gems.filter((g) => !g.dead && g.x + g.r > -20);

      // collisions
      const cartLeft: number = CART_X - CART_W / 2;
      const cartRight: number = CART_X + CART_W / 2;
      const cartBottom: number = cartY + CART_H;

      for (const o of obstacles) {
        const oLeft: number = o.x;
        const oRight: number = o.x + o.w;
        const overlapX: boolean = cartRight > oLeft && cartLeft < oRight;
        if (!overlapX) continue;
        if (o.gap) {
          // fall in if not high enough above the ground
          if (cartBottom > GROUND_Y - 4) { finish(); return; }
        } else {
          // rock: short obstacle sitting on the ground
          const rockTop: number = GROUND_Y - 30;
          if (cartBottom > rockTop) { finish(); return; }
        }
      }

      for (const g of gems) {
        if (g.dead) continue;
        const dxg: number = g.x - CART_X;
        const dyg: number = g.y - (cartY + CART_H / 2);
        if (Math.hypot(dxg, dyg) < g.r + CART_W / 2) {
          g.dead = true;
          gemCount += 1;
        }
      }

      // ---------- draw ----------
      ctx.fillStyle = "#1a0f08";
      ctx.fillRect(0, 0, W, H);

      // cave background streaks (parallax)
      ctx.strokeStyle = "rgba(255,255,255,.05)";
      ctx.lineWidth = 1;
      const par: number = (distance * 0.3) % 60;
      for (let i = -1; i < W / 60 + 1; i++) {
        const x: number = i * 60 - par;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 20, H);
        ctx.stroke();
      }

      // ground / track: draw segments, skipping gaps
      const drawnGaps: Obstacle[] = obstacles.filter((o) => o.gap);
      ctx.fillStyle = "#5a3a22";
      let cursor: number = 0;
      const segs: Array<[number, number]> = [];
      const sortedGaps: Obstacle[] = drawnGaps
        .slice()
        .sort((a, b) => a.x - b.x);
      for (const g of sortedGaps) {
        const start: number = Math.max(cursor, 0);
        const end: number = Math.min(W, g.x);
        if (end > start) segs.push([start, end]);
        cursor = Math.max(cursor, g.x + g.w);
      }
      if (cursor < W) segs.push([Math.max(cursor, 0), W]);
      for (const [s, e] of segs) {
        ctx.fillStyle = "#5a3a22";
        ctx.fillRect(s, GROUND_Y, e - s, H - GROUND_Y);
        // rail
        ctx.fillStyle = "#8a8f99";
        ctx.fillRect(s, GROUND_Y, e - s, 5);
        // ties
        ctx.fillStyle = "#3e2817";
        const tieOff: number = distance % 40;
        for (let x = s - tieOff; x < e; x += 40) {
          const tx: number = Math.max(s, x);
          ctx.fillRect(tx, GROUND_Y + 10, Math.min(14, e - tx), 8);
        }
      }

      // rocks
      for (const o of obstacles) {
        if (o.gap) continue;
        ctx.fillStyle = "#7d7d7d";
        ctx.beginPath();
        const rx: number = o.x + o.w / 2;
        ctx.moveTo(o.x, GROUND_Y);
        ctx.lineTo(rx - 4, GROUND_Y - 30);
        ctx.lineTo(rx + 6, GROUND_Y - 26);
        ctx.lineTo(o.x + o.w, GROUND_Y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#555";
        ctx.stroke();
      }

      // gems
      for (const g of gems) {
        if (g.dead) continue;
        ctx.save();
        ctx.translate(g.x, g.y);
        ctx.fillStyle = "#3dd7ff";
        ctx.beginPath();
        ctx.moveTo(0, -g.r);
        ctx.lineTo(g.r, 0);
        ctx.lineTo(0, g.r);
        ctx.lineTo(-g.r, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,.55)";
        ctx.beginPath();
        ctx.moveTo(0, -g.r);
        ctx.lineTo(g.r * 0.5, -g.r * 0.2);
        ctx.lineTo(0, 0);
        ctx.lineTo(-g.r * 0.5, -g.r * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // cart
      ctx.save();
      ctx.translate(CART_X, cartY);
      // body
      ctx.fillStyle = "#c0392b";
      ctx.beginPath();
      const roundRect = (ctx as CanvasRenderingContext2D & {
        roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
      }).roundRect;
      if (roundRect) {
        roundRect.call(ctx, -CART_W / 2, 4, CART_W, CART_H - 6, 5);
        ctx.fill();
      } else {
        ctx.fillRect(-CART_W / 2, 4, CART_W, CART_H - 6);
      }
      // penguin head poking out
      ctx.fillStyle = "#1c2733";
      ctx.beginPath();
      ctx.arc(0, -2, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-3, -3, 2.4, 0, Math.PI * 2);
      ctx.arc(4, -3, 2.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f5a623";
      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.lineTo(6, 3);
      ctx.lineTo(0, 5);
      ctx.closePath();
      ctx.fill();
      // wheels
      ctx.fillStyle = "#222";
      ctx.beginPath();
      ctx.arc(-CART_W / 2 + 10, CART_H, 7, 0, Math.PI * 2);
      ctx.arc(CART_W / 2 - 10, CART_H, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // HUD
      ctx.fillStyle = "#fff";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.font = "bold 20px system-ui, sans-serif";
      ctx.fillText(`✨ ${scoreNow()}`, 14, 28);
      ctx.textAlign = "right";
      ctx.font = "bold 16px system-ui, sans-serif";
      ctx.fillText(`Distance ${Math.floor(distance)}m`, W - 14, 22);
      ctx.fillText(`Gems ${gemCount}`, W - 14, 42);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [round]);

  return (
    <div className="modal-backdrop">
      <div className="modal minigame-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>🛒 Cart Surfer</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="minigame-body">
          <canvas ref={canvasRef} className="minigame-canvas" />
          {!done ? (
            <p className="hint">
              <b>Click</b> (or press <b>Space</b>) to jump the cart over <b>gaps</b> and <b>rocks</b>. Grab <b>💎 gems</b> for bonus points. It only gets faster!
            </p>
          ) : (
            <div className="minigame-result">
              <h3>You crashed!</h3>
              <p>
                You rode <strong>{finalDist}m</strong> and scored <strong>{finalScore}</strong>!
              </p>
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
