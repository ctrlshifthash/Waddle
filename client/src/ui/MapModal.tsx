import { game } from "../net/GameClient";
import { useGame } from "../net/useGame";
import { Modal } from "./ShopModal";
import { ROOMS, MAP_ORDER } from "@shared";

export function MapModal({ onClose }: { onClose: () => void }) {
  const g = useGame();
  return (
    <Modal title={`🗺️ Map — World “${g.worldId}”`} onClose={onClose}>
      <p className="hint">Click any place to travel there instantly.</p>
      <div className="map-grid">
        {MAP_ORDER.map((id) => {
          const r = ROOMS[id];
          if (!r) return null;
          const here = !g.isIgloo && g.roomId === id;
          return (
            <button
              key={id}
              className={here ? "map-card here" : "map-card"}
              disabled={here}
              onClick={() => { game.joinRoom(id); onClose(); }}
            >
              <div className="map-card-name">{r.name}</div>
              <div className="map-card-hint">{r.mapHint ?? ""}</div>
              {here && <div className="map-here-badge">You are here</div>}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
