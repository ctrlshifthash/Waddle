import { useState, type ReactNode } from "react";
import { game } from "../net/GameClient";
import { useGame } from "../net/useGame";
import { ITEMS, FURNITURE } from "@shared";
import { ItemIcon } from "./ItemIcon";

export function ShopModal({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const [tab, setTab] = useState<"clothing" | "furniture">("clothing");

  return (
    <Modal title="🛍️ Shop" onClose={onClose} coins={g.coins}>
      <div className="tabs">
        <button className={tab === "clothing" ? "tab active" : "tab"} onClick={() => setTab("clothing")}>Clothing</button>
        <button className={tab === "furniture" ? "tab active" : "tab"} onClick={() => setTab("furniture")}>Furniture</button>
      </div>

      <p className="hint">
        {tab === "clothing"
          ? "Buy items, then equip them in your 👕 Closet."
          : "Buy furniture, then place it in your 🏠 Igloo (open it and tap 🛠 Edit)."}
      </p>

      <div className="shop-grid">
        {tab === "clothing"
          ? ITEMS.filter((it) => !it.event).map((it) => {
              const owned = g.inventory.includes(it.id);
              return (
                <div key={it.id} className="shop-item">
                  <ItemIcon id={it.id} size={64} />
                  <div className="shop-item-name">{it.name}</div>
                  <div className="shop-item-slot">{it.slot}</div>
                  <BuyButton id={it.id} price={it.price} owned={owned} coins={g.coins} />
                </div>
              );
            })
          : FURNITURE.map((f) => {
              const owned = g.inventory.includes(f.id);
              return (
                <div key={f.id} className="shop-item">
                  <ItemIcon id={f.id} size={64} />
                  <div className="shop-item-name">{f.name}</div>
                  <div className="shop-item-slot">furniture</div>
                  <BuyButton id={f.id} price={f.price} owned={owned} coins={g.coins} />
                </div>
              );
            })}
      </div>
    </Modal>
  );
}

function BuyButton({ id, price, owned, coins }: { id: string; price: number; owned: boolean; coins: number }) {
  if (owned) return <button className="btn-sm btn-owned" disabled>Owned</button>;
  const afford = coins >= price;
  return (
    <button className="btn-sm btn-buy" disabled={!afford} onClick={() => game.buy(id)}>
      {price === 0 ? "Free" : `🪙 ${price}`}
    </button>
  );
}

export function Modal({ title, coins, onClose, children }: {
  title: string; coins?: number; onClose: () => void; children: ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          {coins !== undefined && <span className="coin-pill">🪙 {coins}</span>}
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
