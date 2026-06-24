import { useEffect, useReducer } from "react";
import { game } from "../net/GameClient";
import { Modal } from "./ShopModal";
import { PenguinPreview } from "./PenguinPreview";
import { ItemIcon } from "./ItemIcon";
import { CLOTHING_SLOTS, ITEMS, PUFFLE_BY_ID, type ClothingSlot } from "@shared";

const SLOT_LABEL: Record<ClothingSlot, string> = {
  color: "Color", head: "Head", face: "Face", neck: "Neck",
  body: "Body", hand: "Hand", feet: "Feet",
};

export function ClosetModal({ onClose }: { onClose: () => void }) {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    const fn = () => force();
    game.on("playerChange", fn);
    return () => game.off("playerChange", fn);
  }, []);

  const me = game.players.get(game.sessionId) as any;
  const outfit = {
    color: me?.color ?? "color_blue", head: me?.head ?? "", face: me?.face ?? "",
    neck: me?.neck ?? "", body: me?.body ?? "", hand: me?.hand ?? "", feet: me?.feet ?? "",
  };
  const puffleColor = me?.puffle ? PUFFLE_BY_ID[me.puffle]?.color : undefined;

  return (
    <Modal title="👕 My Closet" coins={game.coins} onClose={onClose}>
      <div className="closet-layout">
        <div className="closet-preview">
          <PenguinPreview outfit={outfit} puffleColor={puffleColor} size={170} />
          <div className="muted">{me?.name ?? "You"}</div>
        </div>
        <div className="closet-slots">
      {CLOTHING_SLOTS.map((slot) => {
        const owned = ITEMS.filter((i) => i.slot === slot && game.inventory.includes(i.id));
        const current = (me as any)?.[slot] ?? "";
        return (
          <div key={slot} className="closet-row">
            <div className="closet-slot">{SLOT_LABEL[slot]}</div>
            <div className="closet-items">
              {slot !== "color" && (
                <button
                  className={current === "" ? "closet-chip active" : "closet-chip"}
                  onClick={() => game.equip(slot, "")}
                >None</button>
              )}
              {owned.length === 0 && slot !== "color" && (
                <span className="closet-empty">— buy items in the Shop —</span>
              )}
              {owned.map((it) => (
                <button
                  key={it.id}
                  className={current === it.id ? "closet-chip active" : "closet-chip"}
                  onClick={() => game.equip(slot, it.id)}
                  title={it.name}
                >
                  <ItemIcon id={it.id} size={30} />
                  {it.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
        </div>
      </div>
      <p className="hint">Tip: buy more colors &amp; clothing at the 🛍️ Shop (Coffee Shop) or the 🛍️ Shop button.</p>
    </Modal>
  );
}
