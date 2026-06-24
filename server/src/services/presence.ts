// Global online-presence registry across all rooms/worlds, so friends lists can
// show who's online and where (for jump-to-friend). In-memory (single process);
// swap for Redis when scaling horizontally.

export interface Presence {
  key: string;
  name: string;
  area: string;      // "<world>@<room>"
  sessionId: string; // the session that owns this presence right now
}

const online = new Map<string, Presence>();

export function setOnline(p: Presence) {
  online.set(p.key, p);
}

/** Only clear if this exact session still owns it (avoids races when switching rooms). */
export function setOffline(key: string, sessionId: string) {
  const cur = online.get(key);
  if (cur && cur.sessionId === sessionId) online.delete(key);
}

export function get(key: string): Presence | undefined {
  return online.get(key);
}

export function isOnline(key: string): boolean {
  return online.has(key);
}
