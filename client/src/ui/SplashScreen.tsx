import { useEffect, useState } from "react";
import { Snow } from "./Snow";

/** Branded boot splash shown once before the site loads in. Icy theme, the Waddle
 *  World mascot (with its igloo), wordmark and a loading bar — then fades away. */
export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const fade = setTimeout(() => setLeaving(true), 1900);
    const done = setTimeout(() => onDone?.(), 2450);
    return () => { clearTimeout(fade); clearTimeout(done); };
  }, [onDone]);

  return (
    <div className={leaving ? "splash leaving" : "splash"} aria-label="Loading Waddle World">
      <Snow count={44} />
      <div className="splash-inner">
        <div className="splash-logo-wrap">
          <img className="splash-logo" src="/logo.png" alt="Waddle World" />
        </div>
        <h1 className="splash-title">Waddle World</h1>
        <p className="splash-tag">Waddling onto the island…</p>
        <div className="loading-bar"><span /></div>
      </div>
    </div>
  );
}
