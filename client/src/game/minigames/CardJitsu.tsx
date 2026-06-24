import { useState } from "react";
import { game } from "../../net/GameClient";
import { useGame } from "../../net/useGame";
import {
  ELEMENTS, ELEMENT_ICON, ELEMENT_COLOR, beats, hasWinningSet, type Card, type Element,
} from "@shared";

let seq = 1;
function makeCard(): Card {
  const element = ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)] as Element;
  return { id: seq++, element, value: 2 + Math.floor(Math.random() * 9) };
}
function makeHand(n: number): Card[] {
  return Array.from({ length: n }, makeCard);
}

export function CardJitsu({ onClose }: { onClose: () => void }) {
  const [round, setRound] = useState(0);
  return <Match key={round} onReplay={() => setRound((r) => r + 1)} onClose={onClose} />;
}

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
        <span key={c.id} className="cj-pip" style={{ background: ELEMENT_COLOR[c.element] }}>
          {ELEMENT_ICON[c.element]}
        </span>
      ))}
    </div>
  );
}

function Match({ onReplay, onClose }: { onReplay: () => void; onClose: () => void }) {
  const g = useGame();
  const [hand, setHand] = useState<Card[]>(() => makeHand(4));
  const [aiHand, setAiHand] = useState<Card[]>(() => makeHand(4));
  const [myPile, setMyPile] = useState<Card[]>([]);
  const [aiPile, setAiPile] = useState<Card[]>([]);
  const [last, setLast] = useState<{ mine: Card; ai: Card; text: string } | null>(null);
  const [over, setOver] = useState<null | "win" | "lose">(null);

  const play = (card: Card) => {
    if (over) return;
    const ai = aiHand[Math.floor(Math.random() * aiHand.length)];

    let text: string;
    let myNext = myPile;
    let aiNext = aiPile;
    if (card.element === ai.element) {
      if (card.value > ai.value) { myNext = [...myPile, card]; text = "Higher card — you win the round!"; }
      else if (ai.value > card.value) { aiNext = [...aiPile, ai]; text = "Opponent had the higher card."; }
      else { text = "Tie — no card won."; }
    } else if (beats(card.element, ai.element)) {
      myNext = [...myPile, card];
      text = `${ELEMENT_ICON[card.element]} beats ${ELEMENT_ICON[ai.element]} — you win the round!`;
    } else {
      aiNext = [...aiPile, ai];
      text = `${ELEMENT_ICON[ai.element]} beats ${ELEMENT_ICON[card.element]} — opponent wins.`;
    }

    setMyPile(myNext);
    setAiPile(aiNext);
    setLast({ mine: card, ai, text });
    setHand([...hand.filter((c) => c.id !== card.id), makeCard()]);
    setAiHand([...aiHand.filter((c) => c.id !== ai.id), makeCard()]);

    if (hasWinningSet(myNext)) { setOver("win"); game.cardJitsuResult(true); }
    else if (hasWinningSet(aiNext)) { setOver("lose"); game.cardJitsuResult(false); }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal minigame-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>🥋 Card-Jitsu</h2>
          <span className="coin-pill">{g.beltName} belt · {g.cardJitsuWins} wins</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="cj-body">
          <p className="hint">Win 3 cards of the same element, or one of each (🔥💧❄️). Fire &gt; Snow &gt; Water &gt; Fire.</p>

          <div className="cj-row"><span className="cj-label">Opponent</span><Pile cards={aiPile} /></div>
          <div className="cj-row"><span className="cj-label">You</span><Pile cards={myPile} /></div>

          {last && (
            <div className="cj-last">
              <CardView card={last.mine} /> <span className="cj-vs">vs</span> <CardView card={last.ai} />
              <div className="cj-result">{last.text}</div>
            </div>
          )}

          {!over ? (
            <>
              <div className="cj-label">Your hand — pick a card</div>
              <div className="cj-hand">
                {hand.map((c) => <CardView key={c.id} card={c} onClick={() => play(c)} />)}
              </div>
            </>
          ) : (
            <div className="minigame-result">
              <h3>{over === "win" ? "🎉 You are the winner!" : "Opponent won this match"}</h3>
              <p>{over === "win" ? `+ coins and Card-Jitsu progress toward your next belt.` : "Try again!"}</p>
              <div className="row">
                <button className="btn btn-primary" onClick={onReplay}>Play again</button>
                <button className="btn btn-ghost" onClick={onClose}>Done</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
