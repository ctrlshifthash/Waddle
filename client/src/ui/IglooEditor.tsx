import { useEffect, useState } from "react";
import { useGame } from "../net/useGame";
import { sceneBridge } from "../game/sceneBridge";
import { ItemIcon } from "./ItemIcon";
import { FURNITURE } from "@shared";

export function IglooEditor({ onClose, onOpenShop }: { onClose: () => void; onOpenShop: () => void }) {
  const g = useGame();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    sceneBridge.scene?.setEditMode(true);
    return () => sceneBridge.scene?.setEditMode(false);
  }, []);

  useEffect(() => {
    sceneBridge.scene?.setSelectedFurniture(selected);
  }, [selected]);

  const owned = FURNITURE.filter((f) => g.inventory.includes(f.id));

  return (
    <div className="igloo-editor">
      <div className="igloo-editor-head">
        <strong>🛠 Igloo Editor</strong>
        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
      <p className="hint">
        Pick furniture, then <b>click the floor</b> to place it. <b>Click any furniture</b> to remove it.
      </p>
      <div className="igloo-furn-list">
        {owned.length === 0 && <span className="closet-empty">No furniture yet — buy some!</span>}
        {owned.map((f) => (
          <button
            key={f.id}
            className={selected === f.id ? "closet-chip active" : "closet-chip"}
            onClick={() => setSelected(selected === f.id ? null : f.id)}
          >
            <ItemIcon id={f.id} size={32} />
            {f.name}
          </button>
        ))}
      </div>
      <button className="btn-sm btn-buy" onClick={onOpenShop}>🛍️ Buy furniture</button>
    </div>
  );
}
