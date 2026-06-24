import { useEffect, useState } from "react";
import { Snow } from "./Snow";
import { SERVERS, populationLevel, normalizeWorldId } from "@shared";
import { HTTP_BASE } from "../net/endpoint";

export function ServerSelect({
  name, onPick, onBack,
}: { name: string; onPick: (worldId: string) => void; onBack: () => void }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [code, setCode] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`${HTTP_BASE}/worlds`)
        .then((r) => r.json())
        .then((list: { id: string; players: number }[]) => {
          if (!alive || !Array.isArray(list)) return;
          const m: Record<string, number> = {};
          for (const w of list) m[w.id] = w.players;
          setCounts(m);
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 4000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return (
    <div className="server-select">
      <Snow count={36} />
      <div className="server-card">
        <div className="server-head">
          <button className="link-btn" onClick={onBack}>‹ Back</button>
          <h1>Choose your server</h1>
          <span className="server-name">🐧 {name}</span>
        </div>
        <p className="hint">Pick a server to waddle into — green means quiet, red means packed.</p>

        <div className="server-list">
          {SERVERS.map((s) => {
            const count = counts[s.id] ?? 0;
            const pop = populationLevel(count);
            return (
              <button key={s.id} className="server-row" onClick={() => onPick(s.id)} disabled={pop.level === "full"}>
                <span className="server-row-name">{s.name}</span>
                <span className={`pop-bar pop-${pop.level}`}><span style={{ width: `${pop.pct}%` }} /></span>
                <span className="pop-label">{pop.label}</span>
                <span className="server-join">Join ›</span>
              </button>
            );
          })}
        </div>

        <div className="server-private">
          <span className="muted">Private world (share the code with friends):</span>
          <div className="row">
            <input
              className="text-input"
              placeholder="e.g. myparty"
              maxLength={20}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && code.trim()) onPick(normalizeWorldId(code)); }}
            />
            <button className="btn-sm btn-buy" disabled={!code.trim()} onClick={() => onPick(normalizeWorldId(code))}>Join</button>
          </div>
        </div>
      </div>
    </div>
  );
}
