import { useEffect, useState } from "react";
import { game } from "../../net/GameClient";
import {
  ELEMENT_ICON, ELEMENT_COLOR,
  type Card, type CjStartPayload, type CjRoundPayload, type CjEndPayload, type CjCancelPayload,
} from "@shared";

function CardView({ card, onClick }: { card: Card; onClick?: () => void }) {
  return (
    <button
      className="cj-card"
      style={{ background: ELEMENT_COLOR[card.element], cursor: onClick ? "pointer" : "default" }}
      onClick={onClick}
      disabled={!onClick}
    >
      <span className="cj-card-icon">{ELEMENT_ICON[card.element]}</span>
      <span className="cj-card-val">{card.value}</span>
    </button>
  );
}

function Pile({ cards }: { cards: Card[] }) {
  return (
    <div className="cj-pile">
      {cards.length === 0 && <span className="muted">—</span>}
      {cards.map((c) => (
        <span key={c.id} className="cj-pip" style={{ background: ELEMENT_COLOR[c.element] }}>{ELEMENT_ICON[c.element]}</span>
      ))}
    </div>
  );
}

export function CardJitsuMP({ start, onClose }: { start: CjStartPayload; onClose: () => void }) {
  const matchId = start.matchId;
  const [hand, setHand] = useState<Card[]>(start.hand);
  const [myPile, setMyPile] = useState<Card[]>([]);
  const [oppPile, setOppPile] = useState<Card[]>([]);
  const [last, setLast] = useState<CjRoundPayload | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [over, setOver] = useState<null | "win" | "lose" | "cancel">(null);

  useEffect(() => {
    const onRound = (m: CjRoundPayload) => {
      if (m.matchId !== matchId) return;
      setHand(m.hand); setMyPile(m.yourPile); setOppPile(m.oppPile); setLast(m); setWaiting(false);
    };
    const onEnd = (m: CjEndPayload) => { if (m.matchId === matchId) setOver(m.won ? "win" : "lose"); };
    const onCancel = (m: CjCancelPayload) => { if (m.matchId === matchId) setOver("cancel"); };
    game.on("cjRound", onRound); game.on("cjEnd", onEnd); game.on("cjCancel", onCancel);
    return () => { game.off("cjRound", onRound); game.off("cjEnd", onEnd); game.off("cjCancel", onCancel); };
  }, [matchId]);

  const play = (c: Card) => { if (waiting || over) return; game.cjPlay(matchId, c.id); setWaiting(true); };
  const quit = () => { if (!over) game.cjQuit(matchId); onClose(); };

  return (
    <div className="modal-backdrop">
      <div className="modal minigame-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>🥋 Card-Jitsu vs {start.opponentName}</h2>
          <button className="modal-close" onClick={quit}>✕</button>
        </div>
        <div className="cj-body">
          <p className="hint">Win 3 cards of the same element, or one of each (🔥💧❄️). Fire &gt; Snow &gt; Water &gt; Fire.</p>
          <div className="cj-row"><span className="cj-label">{start.opponentName}</span><Pile cards={oppPile} /></div>
          <div className="cj-row"><span className="cj-label">You</span><Pile cards={myPile} /></div>

          {last && (
            <div className="cj-last">
              <CardView card={last.yourCard} /> <span className="cj-vs">vs</span> <CardView card={last.oppCard} />
              <div className="cj-result">
                {last.result === "win" ? "You won the round!" : last.result === "lose" ? "Opponent won the round" : "Tie — no card won"}
              </div>
            </div>
          )}

          {over ? (
            <div className="minigame-result">
              <h3>{over === "win" ? "🎉 You won the match!" : over === "lose" ? "Opponent won the match" : "Match ended"}</h3>
              <div className="row"><button className="btn btn-primary" onClick={onClose}>Done</button></div>
            </div>
          ) : waiting ? (
            <div className="cj-waiting">Waiting for {start.opponentName} to play…</div>
          ) : (
            <>
              <div className="cj-label">Your hand — pick a card</div>
              <div className="cj-hand">{hand.map((c) => <CardView key={c.id} card={c} onClick={() => play(c)} />)}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
