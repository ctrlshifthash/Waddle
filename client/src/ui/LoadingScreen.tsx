import { useEffect, useState } from "react";
import { Snow } from "./Snow";

const TIPS = [
  "Tip: Click anywhere to waddle around.",
  "Tip: Earn coins by playing minigames.",
  "Tip: Adopt a puffle at the Pet Shop — it'll dig up coins!",
  "Tip: Hidden pins are scattered around the island.",
  "Tip: Win Card-Jitsu at the Dojo to earn ninja belts.",
  "Tip: Use the 🗺️ Map to travel anywhere instantly.",
  "Tip: Complete Quests for coins and to level up.",
];

export function LoadingScreen({ status }: { status: string }) {
  const [tip, setTip] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 2400);
    return () => clearInterval(t);
  }, []);

  const failed = status === "error";

  return (
    <div className="loading-screen">
      <Snow count={36} />
      <div className="loading-center">
        <div className="loading-scene">
          <div className="loading-igloo">
            <div className="igloo-dome" />
            <div className="igloo-door" />
          </div>
          <div className="loading-penguin">🐧</div>
        </div>

        <h2 className="loading-title">
          {failed ? "Couldn't reach the island" : "Waddling to the island…"}
        </h2>

        {failed ? (
          <p className="loading-tip">Is the server running? It should auto-reconnect — try refreshing.</p>
        ) : (
          <>
            <div className="loading-bar"><span /></div>
            <p className="loading-tip">{TIPS[tip]}</p>
          </>
        )}
      </div>
    </div>
  );
}
