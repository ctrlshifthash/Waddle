export function WelcomeModal({ onClose, onOpenQuests }: { onClose: () => void; onOpenQuests: () => void }) {
  return (
    <div className="modal-backdrop">
      <div className="modal welcome-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>🐧 Welcome to Waddle World!</h2>
        </div>
        <div className="modal-body">
          <p className="welcome-intro">Here's how to play:</p>
          <ul className="welcome-list">
            <li><b>🚶 Click anywhere</b> to waddle your penguin around.</li>
            <li><b>🗺️ Map</b> button — travel between rooms instantly.</li>
            <li><b>🎮 Minigames</b> (at the Dock, Beach, Dojo…) earn you 🪙 coins.</li>
            <li><b>🛍️ Shop</b> for clothes, then <b>👕 Closet</b> to wear them — everyone sees your look.</li>
            <li><b>🏠 Igloo</b> to decorate, <b>🐾 Pet Shop</b> for puffles, <b>🥋 Dojo</b> for Card-Jitsu belts.</li>
            <li><b>👥 Click another penguin</b> to see their card and add them as a friend.</li>
            <li><b>📋 Quests</b> give you goals + rewards — and level you up!</li>
          </ul>
          <p className="hint">Tip: start with the <b>Getting Started</b> quests — they walk you through everything and pay you coins.</p>
          <div className="welcome-actions">
            <button className="btn btn-primary" onClick={() => { onClose(); onOpenQuests(); }}>
              Show me my Quests →
            </button>
            <button className="btn btn-ghost" onClick={onClose}>Just let me play</button>
          </div>
        </div>
      </div>
    </div>
  );
}
