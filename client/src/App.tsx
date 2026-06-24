import { useState } from "react";
import { PrivyGate } from "./auth/PrivyGate";
import { GuestGate } from "./auth/GuestGate";
import { Landing } from "./ui/Landing";
import { SplashScreen } from "./ui/SplashScreen";

export function App({ privyEnabled }: { privyEnabled: boolean }) {
  const [booting, setBooting] = useState(true);
  const [started, setStarted] = useState(false);
  if (booting) return <SplashScreen onDone={() => setBooting(false)} />;
  if (!started) return <Landing onPlay={() => setStarted(true)} />;
  const onExit = () => setStarted(false);
  return privyEnabled ? <PrivyGate onExit={onExit} /> : <GuestGate onExit={onExit} />;
}
