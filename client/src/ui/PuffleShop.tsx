import { useState } from "react";
import { game } from "../net/GameClient";
import { useGame } from "../net/useGame";
import { Modal } from "./ShopModal";
import { PUFFLE_TYPES, PUFFLE_BY_ID } from "@shared";

export function PuffleShop({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const [tab, setTab] = useState<"adopt" | "mine">("adopt");

  return (
    <Modal title="🐾 Pet Shop" coins={g.coins} onClose={onClose}>
      <div className="tabs">
        <button className={tab === "adopt" ? "tab active" : "tab"} onClick={() => setTab("adopt")}>Adopt</button>
        <button className={tab === "mine" ? "tab active" : "tab"} onClick={() => setTab("mine")}>
          My Puffles ({g.puffles.length})
        </button>
      </div>

      {tab === "adopt" ? (
        <div className="shop-grid">
          {PUFFLE_TYPES.map((p) => {
            const owned = g.puffles.some((x) => x.type === p.id);
            return (
              <div key={p.id} className="shop-item">
                <span className="puffle-dot" style={{ background: p.color }} />
                <div className="shop-item-name">{p.name}</div>
                <button
                  className="btn-sm btn-buy"
                  disabled={g.coins < p.price}
                  onClick={() => game.adoptPuffle(p.id)}
                >
                  🪙 {p.price}{owned ? " +" : ""}
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="puffle-list">
          {g.puffles.length === 0 && <span className="closet-empty">No puffles yet — adopt one!</span>}
          {g.activePuffle && (
            <button className="btn btn-buy dig-btn" onClick={() => game.digPuffle()}>
              🦴 Send your puffle to dig for coins
            </button>
          )}
          {g.puffles.map((pf) => {
            const t = PUFFLE_BY_ID[pf.type];
            const active = g.activePuffle === pf.id;
            return (
              <div key={pf.id} className="puffle-card">
                <span className="puffle-dot" style={{ background: t?.color ?? "#888" }} />
                <div className="puffle-info">
                  <div className="shop-item-name">{pf.name}{active ? " 🚶" : ""}</div>
                  <div className="bar-row"><span title="Hunger">🍪</span><div className="mini-bar"><span style={{ width: `${pf.hunger}%` }} /></div></div>
                  <div className="bar-row"><span title="Happiness">😊</span><div className="mini-bar happy"><span style={{ width: `${pf.happiness}%` }} /></div></div>
                </div>
                <div className="puffle-actions">
                  <button className="btn-sm" onClick={() => game.feedPuffle(pf.id)}>Feed</button>
                  <button className="btn-sm" onClick={() => game.playPuffle(pf.id)}>Play</button>
                  <button className={active ? "btn-sm btn-owned" : "btn-sm btn-buy"} onClick={() => game.setPuffle(active ? "" : pf.id)}>
                    {active ? "Walking ✓" : "Walk"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p className="hint">Feed &amp; play to keep puffles happy. Your active puffle waddles with you and can dig up coins!</p>
    </Modal>
  );
}
