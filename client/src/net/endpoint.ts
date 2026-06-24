// Resolve the game-server endpoint from VITE_GAME_WS_URL. Accepts a full ws/wss
// URL, OR a bare host (e.g. "waddle-server.onrender.com" — what Render injects via
// a fromService host reference), which we upgrade to a secure wss:// URL. Falls
// back to the local dev server when unset.
function resolveWs(): string {
  const raw = import.meta.env.VITE_GAME_WS_URL?.trim();
  if (!raw) return "ws://localhost:2567";
  if (/^wss?:\/\//i.test(raw)) return raw;
  return `wss://${raw.replace(/^https?:\/\//i, "").replace(/\/+$/, "")}`;
}

/** WebSocket URL for the Colyseus client. */
export const WS_URL = resolveWs();
/** Matching http(s) base for REST calls like /worlds (ws->http, wss->https). */
export const HTTP_BASE = WS_URL.replace(/^ws/, "http");
