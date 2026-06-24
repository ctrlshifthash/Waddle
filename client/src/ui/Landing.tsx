import { useEffect, useState } from "react";
import { Snow } from "./Snow";
import { PenguinPreview } from "./PenguinPreview";
import { rankTitle } from "@shared";
import type { OutfitLike } from "../game/penguinArt";

const HERO_PENGUINS: { outfit: OutfitLike; puffle?: string }[] = [
  { outfit: { color: "color_green", head: "head_party", face: "", neck: "neck_scarf", body: "", hand: "hand_guitar", feet: "feet_boots" }, puffle: "#e23b3b" },
  { outfit: { color: "color_red", head: "head_tophat", face: "face_shades", neck: "", body: "body_tuxedo", hand: "hand_balloon", feet: "" } },
  { outfit: { color: "color_aqua", head: "head_crown", face: "face_3d", neck: "neck_bowtie", body: "body_cape", hand: "", feet: "" }, puffle: "#8a4fd6" },
];

const PILLARS = [
  { icon: "🎮", title: "Play", desc: "A living multiplayer world — 12 rooms, 10 minigames, live chat, quests, puffles & igloos." },
  { icon: "🪙", title: "Earn", desc: "Coins for everything you do, awarded by the server so every payout is fair." },
  { icon: "💎", title: "Get Paid", desc: "Get paid in real SOL from the shared daily pool, straight to your wallet — or spend coins on your penguin." },
];

const STEPS = [
  { icon: "🐧", title: "Create your penguin", desc: "Pick a name and a world and you're in — free, instantly, in your browser. Play as a guest with no wallet, or connect a Solana wallet if you want to cash out later." },
  { icon: "🗺️", title: "Explore & play", desc: "Waddle around 12 snowy rooms, chat with other penguins live, follow the quests, and jump into any of the 10 arcade minigames." },
  { icon: "🪙", title: "Earn coins", desc: "Minigames, quests, stamps and daily logins all pay out coins. Every reward is validated on the server, so the economy stays fair." },
  { icon: "💎", title: "Get paid in SOL", desc: "Spend coins on clothing, furniture and puffles to flex your style — or claim your share of the daily SOL pool, paid as real SOL to your wallet." },
];

const FEATURES = [
  { icon: "🚶", title: "Waddle & Chat", desc: "Explore 12 snowy rooms and meet penguins live, with real-time chat & emotes." },
  { icon: "🎮", title: "10 Minigames", desc: "Coin Dash, Jet Pack, Card-Jitsu and more — each one pays out coins." },
  { icon: "🪙", title: "Earn Real SOL", desc: "Earn coins in-game and get paid real SOL from the shared daily pool." },
  { icon: "👕", title: "Dress Up", desc: "Buy clothes in the shop & show off your style — everyone sees your look." },
  { icon: "🐾", title: "Adopt Puffles", desc: "Cute pets that waddle along with you everywhere you go." },
  { icon: "🏠", title: "Build Your Igloo", desc: "Decorate your own home with furniture that persists across worlds." },
];

// Sample of the community shown on the landing for social proof (illustrative).
const LIVE_PENGUINS: { name: string; level: number; coins: number; outfit: OutfitLike; puffle?: string }[] = [
  { name: "frosty_t", level: 4, coins: 720, outfit: { color: "color_aqua", head: "head_beanie", face: "", neck: "neck_scarf", body: "", hand: "", feet: "" } },
  { name: "PenguPaul", level: 7, coins: 1840, puffle: "#e23b3b", outfit: { color: "color_red", head: "head_cowboy", face: "face_shades", neck: "", body: "", hand: "", feet: "feet_boots" } },
  { name: "iceicebaby", level: 12, coins: 4320, outfit: { color: "color_pink", head: "head_party", face: "", neck: "neck_bowtie", body: "", hand: "hand_balloon", feet: "" } },
  { name: "ChillBro", level: 9, coins: 2680, puffle: "#34c6c6", outfit: { color: "color_green", head: "head_propeller", face: "face_3d", neck: "", body: "body_hoodie", hand: "", feet: "" } },
  { name: "SubZero", level: 24, coins: 11240, outfit: { color: "color_black", head: "head_tophat", face: "face_shades", neck: "neck_tie", body: "body_tuxedo", hand: "", feet: "" } },
  { name: "AuntArctica", level: 16, coins: 6100, puffle: "#8a4fd6", outfit: { color: "color_purple", head: "head_crown", face: "", neck: "", body: "body_cape", hand: "", feet: "" } },
  { name: "snowballz", level: 6, coins: 1320, outfit: { color: "color_yellow", head: "head_beanie", face: "", neck: "neck_scarf", body: "", hand: "hand_guitar", feet: "feet_boots" } },
  { name: "WaddleK", level: 19, coins: 8460, outfit: { color: "color_orange", head: "head_cowboy", face: "face_eyepatch", neck: "", body: "body_raincoat", hand: "hand_fishingrod", feet: "" } },
];

const GAMES = [
  { icon: "🪙", name: "Coin Dash" }, { icon: "🚀", name: "Jet Pack" },
  { icon: "🫘", name: "Bean Counters" }, { icon: "🐾", name: "Puffle Roundup" },
  { icon: "🛒", name: "Cart Surfer" }, { icon: "🥋", name: "Card-Jitsu" },
  { icon: "🌊", name: "Hydro Hopper" }, { icon: "🎣", name: "Ice Fishing" },
  { icon: "👾", name: "Astro Barrier" }, { icon: "🍕", name: "Pizzatron 3000" },
];

const EARN_POINTS = [
  "🎯 Win minigames for instant coin payouts",
  "📋 Complete Getting-Started & Daily quests",
  "🏅 Unlock 16 stamps for milestone bonuses",
  "📆 Claim a daily login bonus every day",
];

const FAQ = [
  { q: "💸 Is it free to play?", a: "Yes. Jump in as a guest — no wallet, no download, no payment. You only need a Solana wallet if you want to claim real SOL from the daily rewards pool." },
  { q: "🪙 How do I earn coins?", a: "Play the 10 minigames, complete quests, collect stamps and claim your daily bonus. Coins are awarded by the server, so payouts are fair." },
  { q: "⛓️ What's the Solana part?", a: "Every day a shared SOL pool is split across all players — claim it up to 3 times a day, paid as real SOL straight to your wallet. It's optional: the whole game works without ever touching crypto, but connect a wallet when you're ready to earn real SOL." },
  { q: "💾 Is my progress saved?", a: "Everything — coins, level, outfit, igloo, puffles, stamps and friends — is saved to your account and follows you across every world." },
  { q: "👥 Can I play with friends?", a: "Yes. Worlds are shared in real time. Add friends, see who's online, and jump straight to them in any room." },
  { q: "🖥️ What do I need?", a: "Just a browser. It runs on desktop and laptop — no install, no plugins. Create a penguin and you're playing in seconds." },
];

// TODO: point these at the real links.
const SOCIALS = [
  { key: "pump", label: "pump.fun", href: "https://pump.fun" },
  { key: "x", label: "X", href: "https://x.com/playWaddleWorld" },
  { key: "github", label: "GitHub", href: "https://github.com/playWaddleWorld/Waddle-World" },
] as const;

function SocialSvg({ k }: { k: string }) {
  if (k === "x")
    return (<svg viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" /></svg>);
  if (k === "github")
    return (<svg viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" /></svg>);
  // pump.fun — official pill logo
  return <img className="social-img" src="/landing/pump.png" alt="" aria-hidden />;
}

function Socials({ lg }: { lg?: boolean }) {
  return (
    <div className={lg ? "socials socials-lg" : "socials"}>
      {SOCIALS.map((s) => (
        <a key={s.key} className={`social social-${s.key}`} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
          <SocialSvg k={s.key} />
          <span className="social-tip">{s.label}</span>
        </a>
      ))}
    </div>
  );
}

export function Landing({ onPlay }: { onPlay: () => void }) {
  // a gently-fluctuating "online" count for social proof
  const [online, setOnline] = useState(214);
  useEffect(() => {
    const t = setInterval(
      () => setOnline((n) => Math.max(176, Math.min(283, n + Math.round((Math.random() - 0.45) * 7)))),
      3500,
    );
    return () => clearInterval(t);
  }, []);

  // reveal sections as they scroll into view
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(".landing .reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden>
        <div className="lbg lbg-1" />
        <div className="lbg lbg-2" />
        <div className="lbg lbg-3" />
        <div className="lbg lbg-4" />
      </div>
      <Snow count={50} />

      <header className="landing-nav">
        <div className="landing-logo"><img className="logo-img" src="/logo.png" alt="" /> <span>Waddle <b className="logo-accent">World</b></span></div>
        <nav className="landing-links">
          <a href="#about">About</a>
          <a href="#how">How it Works</a>
          <a href="#games">Games</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="landing-nav-right">
          <Socials />
          <button className="btn btn-play landing-nav-play" onClick={onPlay}>Play</button>
        </div>
      </header>

      <section className="landing-hero">
        <div className="hero-penguins">
          {HERO_PENGUINS.map((p, i) => (
            <div className={`hero-peng hp-${i}`} key={i}>
              <PenguinPreview outfit={p.outfit} puffleColor={p.puffle} size={150} />
            </div>
          ))}
        </div>
        <h1 className="hero-title">Waddle into the Island</h1>
        <p className="hero-sub">
          A multiplayer penguin world — play minigames, earn coins, adopt puffles,
          decorate your igloo, and get paid real <b>SOL</b>.
        </p>
        <div className="hero-cta">
          <button className="btn btn-play" onClick={onPlay}>▶ Play</button>
          <span className="hero-note">Free · No download · No wallet needed · Plays in your browser</span>
        </div>
      </section>

      <section className="landing-section" id="about">
        <h2 className="section-title reveal">What is Waddle World?</h2>
        <p className="about-lead reveal">
          <b>Waddle World</b> is a multiplayer penguin game that runs right in your browser — no
          download. Create your own penguin and drop into a shared world: waddle through <b>12 rooms</b>, chat with
          players in real time, play <b>10 arcade minigames</b>, take on quests, dress up, adopt{" "}
          <b>puffles</b> and build your own <b>igloo</b>. Everything you do earns <b>coins</b> — and
          they're not just for show: every day a shared <b>SOL</b> pool is split across all players, paid
          as real SOL straight to your wallet. Jump in <b>free</b> as a guest; connect a wallet when you're ready to claim your SOL.
        </p>
        <div className="pillars">
          {PILLARS.map((p, i) => (
            <div className="pillar reveal" style={{ transitionDelay: `${i * 80}ms` }} key={p.title}>
              <div className="pillar-icon">{p.icon}</div>
              <div className="pillar-title">{p.title}</div>
              <div className="pillar-desc">{p.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" id="how">
        <h2 className="section-title reveal">How it works</h2>
        <p className="section-sub reveal">From zero to earning in four simple steps.</p>
        <div className="steps">
          {STEPS.map((s, i) => (
            <div className="step-card reveal" style={{ transitionDelay: `${i * 80}ms` }} key={s.title}>
              <div className="step-num">{i + 1}</div>
              <div className="step-icon">{s.icon}</div>
              <div className="step-title">{s.title}</div>
              <div className="step-desc">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" id="features">
        <h2 className="section-title reveal">What you can do</h2>
        <div className="landing-features">
          {FEATURES.map((f, i) => (
            <div className="feature-card reveal" style={{ transitionDelay: `${i * 60}ms` }} key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" id="games">
        <h2 className="section-title reveal">10 minigames</h2>
        <p className="section-sub reveal">Every one pays out coins that earn you a share of the daily SOL pool.</p>
        <div className="games-grid">
          {GAMES.map((g, i) => (
            <div className="game-chip reveal" style={{ transitionDelay: `${i * 40}ms` }} key={g.name}>
              <span className="game-ico">{g.icon}</span>{g.name}
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" id="players">
        <h2 className="section-title reveal">Penguins playing right now</h2>
        <p className="section-sub reveal"><span className="live-dot" /> {online} online across the island</p>
        <div className="players-grid">
          {LIVE_PENGUINS.map((p, i) => (
            <div className="player-card reveal" style={{ transitionDelay: `${i * 45}ms` }} key={p.name}>
              <div className="player-av">
                <PenguinPreview outfit={p.outfit} puffleColor={p.puffle} size={84} />
                <span className="player-on" />
              </div>
              <div className="player-name">{p.name}</div>
              <div className="player-meta">Lv {p.level} · {rankTitle(p.level)}</div>
              <div className="player-coins">🪙 {p.coins.toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" id="earn">
        <h2 className="section-title reveal">Play to earn — for real</h2>
        <div className="earn-panel reveal">
          <p>
            Every coin you earn is awarded and checked by the game server, so the economy is fair —
            you can't fake a payout. Spend coins in-game on clothing, furniture and puffles, or
            <b> claim your share of the daily SOL pool</b> — a fixed amount of real SOL split across all
            players every day, up to 3 claims each. SOL payouts are fully optional and gated behind a
            wallet, so you can play and earn from day one without touching crypto.
          </p>
          <div className="earn-points">
            {EARN_POINTS.map((p) => (<div className="earn-point" key={p}>{p}</div>))}
          </div>
        </div>
      </section>

      <section className="landing-strip reveal">
        <div><b>12</b> rooms</div>
        <div><b>10</b> minigames</div>
        <div><b>7</b> puffles</div>
        <div><b>16</b> stamps</div>
        <div><b>∞</b> worlds</div>
      </section>

      <section className="landing-section" id="faq">
        <h2 className="section-title reveal">FAQ</h2>
        <div className="faq-list">
          {FAQ.map((f, i) => (
            <div className="faq-item reveal" style={{ transitionDelay: `${(i % 2) * 80}ms` }} key={f.q}>
              <p className="faq-q">{f.q}</p>
              <p className="faq-a">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="community reveal">
        <h2 className="section-title">Join the colony</h2>
        <p className="section-sub">Follow along, join the colony, dig into the code.</p>
        <Socials lg />
      </section>

      <div className="landing-cta-bottom">
        <button className="btn btn-play" onClick={onPlay}>▶ Enter the Island</button>
      </div>

      {/* decorative snowy ground + igloo */}
      <div className="landing-ground" aria-hidden>
        <div className="ground-igloo">
          <div className="igloo-dome" />
          <div className="igloo-door" />
        </div>
      </div>

      <footer className="landing-footer">
        <Socials />
      </footer>
    </div>
  );
}
