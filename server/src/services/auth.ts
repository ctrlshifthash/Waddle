// Optional Privy auth verification. In dev (no Privy keys set) we trust the
// wallet/name the client sends. Set PRIVY_APP_ID + PRIVY_APP_SECRET and
// PRIVY_ENFORCE=true to require a valid Privy auth token on join.
import { PrivyClient } from "@privy-io/server-auth";

const appId = process.env.PRIVY_APP_ID;
const appSecret = process.env.PRIVY_APP_SECRET;

let privy: PrivyClient | null = null;
if (appId && appSecret) {
  try {
    privy = new PrivyClient(appId, appSecret);
    console.log("[auth] Privy verification enabled");
  } catch (e) {
    console.warn("[auth] failed to init Privy client:", e);
  }
}

export const authEnforced = !!privy && process.env.PRIVY_ENFORCE === "true";

export interface AuthResult {
  userId: string;
}

export async function verifyAuth(token?: string): Promise<AuthResult | null> {
  if (!privy || !token) return null;
  try {
    const claims = await privy.verifyAuthToken(token);
    return { userId: claims.userId };
  } catch {
    return null;
  }
}
