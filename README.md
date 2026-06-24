# 🐧 Club Penguin P2E

A Club-Penguin-style multiplayer browser game with a play-to-earn layer on **Solana**.
Waddle around shared rooms, chat, customize your penguin, play a coin-earning
minigame, decorate your igloo, connect a wallet with **Privy**, and settle your
in-game coins to an on-chain **SPL token**.

The game runs **with zero art and zero config** — penguins, rooms and furniture
are drawn procedurally so you can play immediately and drop in real sprites later.

---

## Quick start

```bash
npm install
npm run dev
```

Then open **http://localhost:5173**.

- `npm run dev` starts the Colyseus game server (`:2567`) and the Vite client (`:5173`) together.
- No `.env` needed to start — you play as a **Guest**, coins are tracked off-chain.
- Open a second browser tab to see real-time multiplayer (two penguins, live).

### Optional config (`.env` at repo root — copy from `.env.example`)

```ini
# Client — enable Solana wallet login
VITE_PRIVY_APP_ID=your-privy-app-id        # from https://dashboard.privy.io
VITE_GAME_WS_URL=ws://localhost:2567

# Server — turn on real on-chain payouts (off by default = ledger only)
SOLANA_SETTLE_ENABLED=false
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_TREASURY_SECRET=<base58 secret key of treasury wallet>
SOLANA_COIN_MINT=<SPL mint address for the coin token>
SOLANA_PAYOUT_MODE=mint                     # "mint" (treasury is mint authority) or "transfer" (treasury holds supply)

# Server — require a verified Privy token to join (optional)
PRIVY_APP_ID=...
PRIVY_APP_SECRET=...
PRIVY_ENFORCE=true
```

---

## What works

**World & social**
- **Worlds** — create or join any world by name on the start screen; each is an independent island. A live world browser shows active worlds + player counts (`/worlds`).
- **Island** — 12 rooms (Town, Coffee Shop, Night Club, Plaza, Pizza Parlor, Pet Shop, Dock, Beach, Snow Forts, Dojo, Ski Village) + per-player **Igloo**, with themed procedural scenery (snow, water, night, interior).
- **Map** — a 🗺️ menu to travel anywhere instantly (plus walk-through door zones).
- **Movement** — click to waddle; smooth, networked, with facing + walk bob.
- **Chat** — free text (profanity-filtered), preset **Safe Chat**, and **emotes** as speech bubbles.
- **Player cards** — click any penguin to see their card (level, belt, stamps, outfit, member-since) and **add them as a friend**.
- **Friends** — friends list with live online status + **jump to a friend** in any world/room.

**Onboarding, goals & earning**
- **Tutorial** — a first-time "how to play" welcome that explains the controls and points you to your Quests.
- **Quests** — Getting-Started quests that teach the game (walk, earn, shop, dress up, explore, adopt a puffle, decorate, Card-Jitsu, make a friend) + **Daily Quests** that reset each day for retention. Live progress bars, claim buttons, and a HUD badge when something's ready to claim.
- **Levels & rank** — earning coins grants XP; level + rank (Newcomer → Legend) in the HUD, with **bonus coins on every level-up**.
- **Stamps** — 16 achievements (Games/Style/Explore/Igloo/Puffles/Social), auto-awarded with coin + XP payouts; browse them in the **Stamp Book**.
- **Daily bonus** — coins for logging in each day.
- **Coins + Shop + Closet** — buy colors / clothing / furniture (each with distinct in-game art); equip from your Closet with a **live penguin preview**; others see your outfit instantly.

**Games**
- **6 minigames** — Coin Dash, Jet Pack Adventure, Bean Counters, Puffle Roundup, Cart Surfer (each in a themed room), all server-validated payouts with anti-spam.
- **Card-Jitsu** — the classic element card battle (🔥 > ❄️ > 💧 > 🔥) at the Dojo, with **ninja belt** progression (White → … → Black → Ninja).

**Pets & home**
- **Puffles** — adopt colored pets at the Pet Shop; your active puffle waddles around with you and everyone can see it.
- **Igloo** — your own room; buy furniture and place/remove it in an in-game editor. Layout persists across worlds.

**Money / P2E**
- **Persistence** — everything (coins, XP, stamps, inventory, outfit, igloo, puffles, friends, belts) is saved per wallet (or per-browser guest id) in `server/data/db.json`.
- **Solana** — log in with a Solana wallet via Privy; **settle** coins to an SPL token (100 coins = 1 COIN by default). On-chain payout is gated behind `SOLANA_SETTLE_ENABLED` so the game is fully playable without any chain setup.

---

## Tech stack

| Layer | Tech |
|------|------|
| Multiplayer server | [Colyseus](https://colyseus.io) 0.16 (authoritative rooms + schema state sync) |
| Game rendering | [Phaser](https://phaser.io) 3.90 (procedural placeholder art) |
| App shell / UI | React 18 + Vite 6 |
| Wallet / auth | [Privy](https://privy.io) (Solana) |
| Chain | Solana — `@solana/web3.js` + `@solana/spl-token` |
| Persistence | lowdb (JSON file; swap for a real DB later) |
| Language | TypeScript everywhere, ESM, npm workspaces |

---

## Project layout

```
shared/                 # contracts shared by client + server (no deps)
  protocol.ts           #   network message names + payloads + JoinOptions
  rooms.ts              #   room layouts, doors, features, igloo def
  items.ts              #   clothing + furniture catalogs
  safechat.ts           #   safe-chat phrases, emotes, profanity filter
  economy.ts            #   coin amounts, minigame payouts, coin->token rate
server/                 # Colyseus game server
  src/index.ts          #   bootstrap (express + ws transport)
  src/rooms/WorldRoom.ts#   the one room type (movement, chat, shop, igloo, settle)
  src/schema/state.ts   #   @colyseus/schema synced state
  src/services/         #   store (lowdb), auth (Privy verify), solana (SPL settle)
client/                 # React + Phaser + Privy
  src/main.tsx          #   Privy provider / guest mode
  src/net/GameClient.ts #   single bridge: Colyseus <-> React <-> Phaser
  src/game/             #   Phaser scene, penguin rig, procedural gfx, minigame
  src/ui/               #   HUD, chat bar, shop, closet, wallet/settle, igloo editor
  src/assets/manifest.ts#   where to map item ids -> real sprite files later
```

---

## Adding real penguin sprites

The game renders procedurally today (`client/src/game/gfx.ts`). To use real art:

1. Put images in `client/public/sprites/...` (served at `/sprites/...`).
2. Fill in the maps in `client/src/assets/manifest.ts` (item/furniture/room → texture key → file).
3. Load them in `WorldScene.preload()` and prefer the sprite texture over the placeholder in `game/Penguin.ts`.

The item catalogs and **all game logic stay unchanged** — only the texture lookup changes.

---

## Enabling on-chain settle (Solana)

1. Create an SPL token (devnet is fine) and note its **mint address**.
2. Fund a **treasury** wallet (base58 secret). It must be the **mint authority** (for `SOLANA_PAYOUT_MODE=mint`) or hold the supply (for `transfer`).
3. Set the `SOLANA_*` vars in `.env` and `SOLANA_SETTLE_ENABLED=true`, then restart the server.
4. In game → **💰 Wallet** → choose an amount → **Settle to Solana**. The server moves tokens to the player's wallet and deducts the coins.

When disabled, settle is a safe no-op that tells the player it's ledger-only (coins are kept).

---

## How it works (architecture)

- One Colyseus room type, `world`, partitioned by an `area` option (`town`, `dock`, `igloo:<key>`, …). Players with the same `area` share an instance via `filterBy(["area"])`.
- Positions, appearance, chat bubbles and igloo furniture live in the synced **schema state**; one-off events (coins, shop/settle results, notices) are messages.
- The client's `GameClient` is the single source of truth: it owns the Colyseus connection, keeps a live snapshot of players/furniture, and emits typed events that both **React** (HUD/modals) and the **Phaser scene** (rendering) subscribe to.

---

## Scripts

```bash
npm run dev           # server + client together
npm run dev:server    # just the Colyseus server
npm run dev:client    # just the Vite client
npm run build         # production build of the client
npm --workspace server run typecheck
npm --workspace client run typecheck
```

---

## Notes & next steps

- Movement is client-predicted and server-relayed (CP-style); coin awards are server-validated for P2E integrity.
- Swap lowdb for Postgres/Redis before any real launch; add rate limits and server-side minigame validation hardening.
- Puffles (pets), more minigames, and friend lists are natural next additions on top of this foundation.
```
