import type { Identity } from "../net/GameClient";
import { normalizeWorldId } from "@shared";

const KEY = "cp_guest_id";

export function getGuestId(): string {
  let v = localStorage.getItem(KEY);
  if (!v) {
    v = "g_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem(KEY, v);
  }
  return v;
}

export function guestIdentity(name: string, worldId: string): Identity {
  return {
    name: name?.trim() || "Penguin",
    walletAddress: null,
    guestId: getGuestId(),
    worldId: normalizeWorldId(worldId),
  };
}
