import { game } from "../net/GameClient";
import { useGame } from "../net/useGame";
import { Modal } from "./ShopModal";

export function EventModal({ onClose }: { onClose: () => void }) {
  const g = useGame();
  const ev = g.event;
  if (!ev || !ev.active) {
    return (
      <Modal title="🎉 Events" onClose={onClose}>
        <p className="hint">No party is running right now — check back soon!</p>
      </Modal>
    );
  }
  return (
    <Modal title={`${ev.emoji} ${ev.name}`} coins={g.coins} onClose={onClose}>
      <div className="event-banner" style={{ background: ev.accent }}>
        <span className="event-emoji">{ev.emoji}</span>
        <span>{ev.name} is here!</span>
      </div>
      <p className="event-tagline">{ev.tagline}</p>
      {ev.claimed ? (
        <button className="btn btn-owned" disabled>✓ Free {ev.freeItemName} claimed</button>
      ) : (
        <button className="btn btn-play" onClick={() => game.claimEvent()}>
          🎁 Claim your free {ev.freeItemName}
        </button>
      )}
      <p className="hint">Limited-time! The {ev.freeItemName} won't be in the shop after the party ends. Rooms are decorated for the occasion — look around!</p>
    </Modal>
  );
}
