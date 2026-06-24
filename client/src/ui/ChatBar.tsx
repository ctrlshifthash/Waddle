import { useState } from "react";
import { game } from "../net/GameClient";
import { SAFE_CHAT, EMOTES, CHAT_MAX } from "@shared";

export function ChatBar() {
  const [text, setText] = useState("");
  const [showSafe, setShowSafe] = useState(false);
  const [showEmotes, setShowEmotes] = useState(false);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    game.chat(t);
    setText("");
  };

  return (
    <div className="chatbar">
      {showSafe && (
        <div className="popover safe-popover">
          {SAFE_CHAT.map((s) => (
            <button key={s.id} className="chip" onClick={() => { game.safechat(s.id); setShowSafe(false); }}>
              {s.text}
            </button>
          ))}
        </div>
      )}
      {showEmotes && (
        <div className="popover emote-popover">
          {EMOTES.map((e) => (
            <button key={e.id} className="emote-btn" title={e.label}
              onClick={() => { game.emote(e.id); setShowEmotes(false); }}>
              {e.glyph}
            </button>
          ))}
        </div>
      )}

      <button className="btn-sm" onClick={() => { setShowEmotes((v) => !v); setShowSafe(false); }}>😀</button>
      <button className="btn-sm" onClick={() => { setShowSafe((v) => !v); setShowEmotes(false); }}>💬</button>
      <input
        className="chat-input"
        value={text}
        maxLength={CHAT_MAX}
        placeholder="Say something… (Enter to send)"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") send(); }}
      />
      <button className="btn-sm btn-send" onClick={send}>Send</button>
    </div>
  );
}
