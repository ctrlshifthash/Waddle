import { useGame } from "../net/useGame";
import { Modal } from "./ShopModal";
import { POSTCARDS_BY_ID } from "@shared";

export function MailModal({ onClose }: { onClose: () => void }) {
  const g = useGame();
  return (
    <Modal title={`✉️ Mailbox (${g.mail.length})`} onClose={onClose}>
      {g.mail.length === 0 && (
        <p className="hint">No postcards yet. Click a penguin and send one — friends will get yours here too!</p>
      )}
      <div className="mail-list">
        {g.mail.map((m) => {
          const pc = POSTCARDS_BY_ID[m.type];
          return (
            <div key={m.id} className="mail-item">
              <span className="mail-emoji">{pc?.emoji ?? "💌"}</span>
              <div className="mail-body">
                <div className="mail-text">{pc?.text ?? "Postcard"}</div>
                <div className="mail-from">from <b>{m.fromName}</b> · {new Date(m.at).toLocaleDateString()}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
