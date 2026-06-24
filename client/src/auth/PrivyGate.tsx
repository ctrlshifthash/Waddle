import { useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useSolanaWallets } from "@privy-io/react-auth/solana";
import { StartScreen } from "../ui/StartScreen";
import { ServerSelect } from "../ui/ServerSelect";
import { GameRoot } from "../GameRoot";
import { getGuestId, guestIdentity } from "./identity";
import { normalizeWorldId } from "@shared";
import type { Identity } from "../net/GameClient";

export function PrivyGate({ onExit }: { onExit?: () => void }) {
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const { wallets } = useSolanaWallets();
  const [pending, setPending] = useState<{ name: string; mode: "guest" | "wallet" } | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);

  const walletAddress = wallets?.[0]?.address ?? null;

  if (identity) return <GameRoot identity={identity} onLogout={logout} onExit={onExit} />;

  if (!pending) {
    return (
      <StartScreen
        privyEnabled
        ready={ready}
        authenticated={authenticated}
        walletAddress={walletAddress}
        onConnect={login}
        onLogout={logout}
        onEnterWallet={(n) => setPending({ name: n?.trim() || "Penguin", mode: "wallet" })}
        onGuest={(n) => setPending({ name: n?.trim() || "Penguin", mode: "guest" })}
      />
    );
  }

  return (
    <ServerSelect
      name={pending.name}
      onBack={() => setPending(null)}
      onPick={(worldId) => {
        if (pending.mode === "wallet") {
          setIdentity({
            name: pending.name,
            walletAddress,
            guestId: getGuestId(),
            worldId: normalizeWorldId(worldId),
            getAuthToken: () => getAccessToken(),
          });
        } else {
          setIdentity(guestIdentity(pending.name, worldId));
        }
      }}
    />
  );
}
