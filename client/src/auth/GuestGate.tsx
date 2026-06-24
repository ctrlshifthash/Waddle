import { useState } from "react";
import { StartScreen } from "../ui/StartScreen";
import { ServerSelect } from "../ui/ServerSelect";
import { GameRoot } from "../GameRoot";
import { guestIdentity } from "./identity";
import type { Identity } from "../net/GameClient";

export function GuestGate({ onExit }: { onExit?: () => void }) {
  const [name, setName] = useState<string | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);

  if (identity) return <GameRoot identity={identity} onExit={onExit} />;
  if (name === null) {
    return <StartScreen privyEnabled={false} onGuest={(n) => setName(n?.trim() || "Penguin")} />;
  }
  return (
    <ServerSelect
      name={name}
      onBack={() => setName(null)}
      onPick={(worldId) => setIdentity(guestIdentity(name, worldId))}
    />
  );
}
