import { useGame } from "../net/useGame";
import { Modal } from "./ShopModal";
import { STAMPS, TOTAL_STAMPS, PINS, TOTAL_PINS, type StampCategory } from "@shared";

const CAT_ORDER: StampCategory[] = ["Games", "Style", "Explore", "Igloo", "Puffles", "Social"];

export function StampBook({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const earned = new Set(g.stamps);

  return (
    <Modal title={`🏅 Stamp Book — ${earned.size}/${TOTAL_STAMPS}`} coins={g.coins} onClose={onClose}>
      <p className="hint">Earn stamps by playing, exploring, shopping and decorating. Each one pays out coins + XP.</p>
      {CAT_ORDER.map((cat) => {
        const list = STAMPS.filter((s) => s.category === cat);
        if (!list.length) return null;
        return (
          <div key={cat} className="stamp-cat">
            <h3 className="stamp-cat-title">{cat}</h3>
            <div className="stamp-grid">
              {list.map((s) => {
                const got = earned.has(s.id);
                return (
                  <div key={s.id} className={got ? "stamp got" : "stamp"}>
                    <div className="stamp-icon">{got ? "🏅" : "🔒"}</div>
                    <div className="stamp-name">{s.name}</div>
                    <div className="stamp-desc">{s.description}</div>
                    <div className="stamp-reward">{got ? "✓ Earned" : `+${s.coinReward} 🪙`}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="stamp-cat">
        <h3 className="stamp-cat-title">📌 Pins — {g.collectedPins.length}/{TOTAL_PINS}</h3>
        <p className="hint">Hidden around the island — explore rooms and click to collect them.</p>
        <div className="stamp-grid">
          {PINS.map((p) => {
            const got = g.collectedPins.includes(p.id);
            return (
              <div key={p.id} className={got ? "stamp got" : "stamp"}>
                <div className="stamp-icon">{got ? p.icon : "❔"}</div>
                <div className="stamp-name">{got ? p.name : "???"}</div>
                <div className="stamp-desc">{got ? "Found" : "Hidden somewhere…"}</div>
                <div className="stamp-reward">{got ? "✓" : `+${p.coins} 🪙`}</div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
