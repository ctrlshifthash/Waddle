import { useState } from "react";
import { game } from "../net/GameClient";
import { useGame } from "../net/useGame";
import { XP_PER_LEVEL } from "@shared";

interface Props {
  onHome: () => void;
  onHelp: () => void;
  onDashboard: () => void;
  onQuests: () => void;
  onEvent: () => void;
  onMap: () => void;
  onShop: () => void;
  onCloset: () => void;
  onStamps: () => void;
  onFriends: () => void;
  onMail: () => void;
  onWallet: () => void;
  onEditor: () => void;
  onLogout?: () => void;
  musicOn: boolean;
  onToggleMusic: () => void;
}

export function Hud({ onHome, onHelp, onDashboard, onQuests, onEvent, onMap, onShop, onCloset, onStamps, onFriends, onMail, onWallet, onEditor, onLogout, musicOn, onToggleMusic }: Props) {
  const g = useGame();
  const into = g.xp % XP_PER_LEVEL;
  const pct = Math.round((into / XP_PER_LEVEL) * 100);
  const claimable = g.claimableQuests;
  const unreadMail = Math.max(0, g.mail.length - Number(localStorage.getItem("cp_mail_seen") || 0));
  const solReady = !!g.solFaucet?.enabled && (g.solFaucet?.claimsLeft ?? 0) > 0;
  const [menuOpen, setMenuOpen] = useState(false);
  const pick = (fn: () => void) => () => { setMenuOpen(false); fn(); };

  return (
    <div className="hud">
      <div className="hud-left">
        <button className="btn-sm btn-home" onClick={onHome} title="Return to the home / landing screen">🏠 Home</button>
        <button className="btn-sm btn-help" onClick={onHelp} title="How to play">❓ How to Play</button>
        <span className="hud-room">📍 {g.roomName || "…"}</span>
        <span className="hud-world">🌍 {g.worldId}</span>
      </div>
      <div className="hud-center">
        <span className="level-pill" title={`${g.rank} · ${into}/${XP_PER_LEVEL} XP`}>
          ⭐ Lv {g.level}
          <span className="xp-bar"><span className="xp-fill" style={{ width: `${pct}%` }} /></span>
        </span>
        <span className="coin-pill">🪙 {g.coins}</span>
      </div>
      <div className="hud-right">
        <button className="btn-sm btn-dash" onClick={onDashboard}>
          📊 Dashboard{solReady && <span className="hud-badge">!</span>}
        </button>
        <button className="btn-sm btn-quests" onClick={onQuests}>
          📋 Quests{claimable > 0 && <span className="hud-badge">{claimable}</span>}
        </button>
        {g.event?.active && (
          <button className="btn-sm btn-event" onClick={onEvent}>
            {g.event.emoji} Party{!g.event.claimed && <span className="hud-badge">!</span>}
          </button>
        )}
        <button className="btn-sm" onClick={onMap}>🗺️ Map</button>
        <button className="btn-sm" onClick={onShop}>🛍️ Shop</button>
        <button className="btn-sm" onClick={onCloset}>👕 Closet</button>
        {g.isIgloo ? (
          <button className="btn-sm" onClick={() => game.exitIgloo()}>⬅ Leave</button>
        ) : (
          <button className="btn-sm" onClick={() => game.enterIgloo()}>🏠 Igloo</button>
        )}
        {g.isIgloo && g.isIglooOwner && (
          <button className="btn-sm" onClick={onEditor}>🛠 Edit</button>
        )}
        <div className="hud-menu-wrap">
          <button className="btn-sm" onClick={() => setMenuOpen((o) => !o)} title="More">
            ☰ More{unreadMail > 0 && <span className="hud-badge">{unreadMail}</span>}
          </button>
          {menuOpen && (
            <>
              <div className="menu-overlay" onClick={() => setMenuOpen(false)} />
              <div className="hud-menu">
                <button onClick={pick(onStamps)}>🏅 Stamps</button>
                <button onClick={pick(onFriends)}>👥 Friends</button>
                <button onClick={pick(onMail)}>
                  ✉️ Mail{unreadMail > 0 && <span className="hud-badge">{unreadMail}</span>}
                </button>
                <button onClick={pick(onWallet)}>💰 Wallet</button>
                <button onClick={pick(onToggleMusic)}>{musicOn ? "🔊 Music: On" : "🔇 Music: Off"}</button>
                {onLogout && <button onClick={pick(onLogout)}>⎋ Log out</button>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
