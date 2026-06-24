import { useState } from "react";
import { game } from "../net/GameClient";
import { Modal } from "./ShopModal";
import { PenguinPreview } from "./PenguinPreview";
import { ITEMS_BY_ID, PUFFLE_BY_ID, POSTCARDS, type CardPayload } from "@shared";

export function PlayerCard({ card, onClose }: { card: CardPayload; onClose: () => void }) {
  const [friended, setFriended] = useState(card.isFriend);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const worn = (["head", "face", "neck", "body", "hand", "feet"] as const)
    .map((s) => ITEMS_BY_ID[card[s]])
    .filter(Boolean);
  const puf = card.puffle ? PUFFLE_BY_ID[card.puffle] : null;
  const since = new Date(card.memberSince).toLocaleDateString();
  const outfit = {
    color: card.color, head: card.head, face: card.face, neck: card.neck,
    body: card.body, hand: card.hand, feet: card.feet,
  };

  return (
    <Modal title={`🐧 ${card.name}`} onClose={onClose}>
      <div className="card-head">
        <PenguinPreview outfit={outfit} puffleColor={puf?.color} size={120} />
        <div>
          {card.isMascot && <div className="mascot-badge">🎖️ Mascot</div>}
          <div className="card-rank">⭐ Level {card.level} · {card.rank}</div>
          <div className="muted">🥋 {card.belt} belt · 🏅 {card.stamps} stamps · 📌 {card.pins} pins</div>
          <div className="muted">Member since {since}</div>
        </div>
      </div>

      <div className="card-items">
        {worn.length === 0 && !puf && <span className="closet-empty">Nothing equipped</span>}
        {worn.map((it) => (
          <span key={it!.id} className="closet-chip">
            <span className="swatch sm" style={{ background: it!.tint }} />{it!.name}
          </span>
        ))}
        {puf && (
          <span className="closet-chip">
            <span className="puffle-dot" style={{ width: 16, height: 16, borderWidth: 1, background: puf.color }} />
            {puf.name}
          </span>
        )}
      </div>

      {card.isMascot ? (
        <button className="btn btn-play" onClick={() => game.meetMascot(card.key)}>
          ✍️ Get autograph (+100 coins)
        </button>
      ) : !card.isSelf && (
        friended ? (
          <button className="btn btn-ghost" onClick={() => { game.removeFriend(card.key); setFriended(false); }}>
            Remove friend
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => { game.addFriend(card.key); setFriended(true); }}>
            ＋ Add friend
          </button>
        )
      )}

      {card.sessionId && !card.isSelf && !card.isMascot && !card.sessionId.startsWith("bot:") && (
        <button className="btn btn-play cj-challenge-btn" onClick={() => { game.cjChallenge(card.sessionId!); onClose(); }}>
          ⚔️ Challenge to Card-Jitsu
        </button>
      )}

      {!card.isSelf && !card.isMascot && (
        <div className="postcard-send">
          {sent ? (
            <p className="hint">📮 Postcard sent to {card.name}!</p>
          ) : !sending ? (
            <button className="btn btn-ghost" onClick={() => setSending(true)}>✉️ Send a postcard</button>
          ) : (
            <div className="postcard-grid">
              {POSTCARDS.map((p) => (
                <button key={p.id} className="postcard-pick" title={p.text}
                  onClick={() => { game.sendPostcard(card.key, p.id); setSent(true); }}>
                  <span className="postcard-emoji">{p.emoji}</span>
                  <span className="postcard-text">{p.text}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
