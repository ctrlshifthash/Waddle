import { useMemo, type CSSProperties } from "react";

/** Decorative falling snow used by the landing + loading screens. */
export function Snow({ count = 40 }: { count?: number }) {
  const flakes = useMemo(
    () =>
      Array.from({ length: count }, () => {
        const style: Record<string, string | number> = {
          left: `${Math.random() * 100}%`,
          width: 3 + Math.random() * 8,
          height: 3 + Math.random() * 8,
          opacity: 0.35 + Math.random() * 0.6,
          animationDuration: `${6 + Math.random() * 11}s`,
          animationDelay: `${-Math.random() * 14}s`,
          "--drift": `${(Math.random() * 2 - 1) * 60}px`,
        };
        return style;
      }),
    [count],
  );
  return (
    <div className="snow" aria-hidden>
      {flakes.map((s, i) => (
        <span key={i} className="flake" style={s as unknown as CSSProperties} />
      ))}
    </div>
  );
}
