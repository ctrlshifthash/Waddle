import { game } from "../net/GameClient";
import { useGame } from "../net/useGame";
import { MAP_ORDER, ROOMS } from "@shared";

const ICON: Record<string, string> = {
  town: "🏙️", coffee: "☕", nightclub: "🪩", plaza: "🎪", pizza: "🍕",
  petshop: "🐾", dock: "⚓", beach: "🏖️", forts: "⛄", dojo: "🥋", ski: "🎿",
};

/** Always-visible vertical rail of room shortcuts — one click to travel, no Map needed. */
export function QuickTravel() {
  const g = useGame();
  return (
    <div className="quick-travel">
      {MAP_ORDER.map((id) => {
        const r = ROOMS[id];
        if (!r) return null;
        const here = !g.isIgloo && g.roomId === id;
        return (
          <button
            key={id}
            className={here ? "qt-btn active" : "qt-btn"}
            title={`Go to ${r.name}`}
            onClick={() => { if (!here) game.joinRoom(id); }}
          >
            <span className="qt-ico">{ICON[id] ?? "📍"}</span>
            <span className="qt-name">{r.name}</span>
          </button>
        );
      })}
    </div>
  );
}
