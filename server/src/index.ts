import path from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

// Load the repo-root .env (single env file for client + server) before anything
// reads process.env.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const p of [path.resolve(__dirname, "../../.env"), path.resolve(process.cwd(), ".env")]) {
  if (existsSync(p)) {
    try { process.loadEnvFile(p); } catch { /* older node */ }
    break;
  }
}

import { createServer } from "node:http";
import express from "express";
import cors from "cors";
import { Server, matchMaker } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { WorldRoom } from "./rooms/WorldRoom.ts";
import { initStore } from "./services/store.ts";

const PORT = Number(process.env.PORT || 2567);

await initStore();

const app = express();
app.use(cors());
app.get("/health", (_req, res) => res.json({ ok: true, game: "club-penguin-p2e" }));

// Discovery: list active worlds with live player counts (igloos excluded).
app.get("/worlds", async (_req, res) => {
  try {
    const rooms = await matchMaker.query({ name: "world" });
    const counts: Record<string, number> = {};
    for (const r of rooms as Array<{ area?: string; clients?: number }>) {
      const area = r.area ?? "";
      const at = area.indexOf("@");
      const worldId = at >= 0 ? area.slice(0, at) : "main";
      const roomId = at >= 0 ? area.slice(at + 1) : area;
      if (roomId.startsWith("igloo:")) continue;
      counts[worldId] = (counts[worldId] ?? 0) + (r.clients ?? 0);
    }
    if (!counts["main"]) counts["main"] = 0; // always advertise the main world
    res.json(
      Object.entries(counts)
        .map(([id, players]) => ({ id, players }))
        .sort((a, b) => b.players - a.players),
    );
  } catch {
    res.json([{ id: "main", players: 0 }]);
  }
});

const httpServer = createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

// One room type; players are grouped into the same instance by `area`.
gameServer.define("world", WorldRoom).filterBy(["area"]);

gameServer.listen(PORT);
console.log(`🐧 Club Penguin server listening on ws://localhost:${PORT}`);
