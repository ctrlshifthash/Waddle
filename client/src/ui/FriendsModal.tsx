import { game } from "../net/GameClient";
import { useGame } from "../net/useGame";
import { Modal } from "./ShopModal";
import { parseArea, ROOMS, isIglooRoom } from "@shared";

function whereLabel(area: string): string {
  if (!area) return "";
  const { worldId, roomId } = parseArea(area);
  const room = isIglooRoom(roomId) ? "Igloo" : ROOMS[roomId]?.name ?? roomId;
  return `${room} · ${worldId}`;
}

export function FriendsModal({ onClose }: { onClose: () => void }) {
  const g = useGame();
  return (
    <Modal title={`👥 Friends (${g.friends.length})`} onClose={onClose}>
      {g.friends.length === 0 && (
        <p className="hint">Click a penguin in the room and choose “Add friend” to build your list.</p>
      )}
      <div className="friend-list">
        {g.friends.map((f) => (
          <div key={f.key} className="friend-row">
            <span className={f.online ? "friend-dot on" : "friend-dot"} />
            <span className="friend-name">{f.name}</span>
            <span className="friend-where">{f.online ? whereLabel(f.area) : "offline"}</span>
            {f.online && (
              <button className="btn-sm btn-buy" onClick={() => { game.jumpTo(f.area); onClose(); }}>Jump</button>
            )}
            <button className="btn-sm" title="Remove" onClick={() => game.removeFriend(f.key)}>✕</button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
