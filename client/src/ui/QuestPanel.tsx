import { game } from "../net/GameClient";
import { useGame } from "../net/useGame";
import { Modal } from "./ShopModal";
import { QUESTS, type QuestKind } from "@shared";

export function QuestPanel({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const byId = new Map(g.quests.map((q) => [q.id, q]));

  const section = (kind: QuestKind, label: string) => (
    <div className="quest-section">
      <h3 className="stamp-cat-title">{label}</h3>
      {QUESTS.filter((q) => q.kind === kind).map((q) => {
        const p = byId.get(q.id);
        const progress = Math.min(p?.progress ?? 0, q.goal);
        const claimed = p?.claimed ?? false;
        const done = (p?.progress ?? 0) >= q.goal;
        const pct = Math.round((progress / q.goal) * 100);
        return (
          <div key={q.id} className={claimed ? "quest claimed" : done ? "quest done" : "quest"}>
            <div className="quest-icon">{q.icon}</div>
            <div className="quest-main">
              <div className="quest-title">{q.title}</div>
              <div className="quest-desc">{q.desc}</div>
              <div className="quest-bar"><span style={{ width: `${pct}%` }} /></div>
            </div>
            <div className="quest-action">
              <div className="quest-prog">{progress}/{q.goal}</div>
              {claimed ? (
                <span className="quest-done-tag">✓ Done</span>
              ) : done ? (
                <button className="btn-sm btn-claim" onClick={() => game.claimQuest(q.id)}>
                  Claim +{q.coinReward}🪙
                </button>
              ) : (
                <span className="quest-reward">+{q.coinReward}🪙</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <Modal title="📋 Quests" coins={g.coins} onClose={onClose}>
      <p className="hint">New here? Do the <b>Getting Started</b> quests — they'll teach you the game and pay you for it. Come back daily for more!</p>
      {section("starter", "🐧 Getting Started")}
      {section("daily", "📅 Daily Quests (reset each day)")}
    </Modal>
  );
}
