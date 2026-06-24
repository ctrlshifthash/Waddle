import { useEffect, useState } from "react";
import { game } from "../net/GameClient";
import type { NoticePayload } from "@shared";

interface Toast extends NoticePayload { id: number; }
let seq = 0;

export function Notices() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onNotice = (n: NoticePayload) => {
      const t: Toast = { ...n, id: ++seq };
      setToasts((cur) => [...cur, t]);
      setTimeout(() => setToasts((cur) => cur.filter((x) => x.id !== t.id)), 3500);
    };
    game.on("notice", onNotice);
    return () => game.off("notice", onNotice);
  }, []);

  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`}>{t.message}</div>
      ))}
    </div>
  );
}
