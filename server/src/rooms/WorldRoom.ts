import { Room, Client } from "colyseus";
import { Player, FurnitureInstance, WorldState } from "../schema/state.ts";
import {
  C2S, S2C, ROOMS, DEFAULT_ROOM, DEFAULT_WORLD, IGLOO_DEF,
  parseArea, makeArea, isIglooRoom, iglooOwnerKey,
  ITEMS_BY_ID, FURNITURE_BY_ID, CLOTHING_SLOTS,
  MINIGAME_PAYOUTS, COINS_PER_TOKEN, MIN_SETTLE_COINS, SOL_FAUCET,
  STAMPS, levelForXp, rankTitle, DAILY_BONUS, DAILY_BONUS_COOLDOWN_MS,
  PUFFLE_BY_ID, MAX_PUFFLES, PINS_BY_ID,
  beltForWins, CARDJITSU_WIN_COINS, WINS_PER_BELT, ELEMENTS, beats, hasWinningSet,
  QUESTS, QUESTS_BY_ID, levelUpBonus, getActiveEvent,
  mascotForRoom, MASCOTS_BY_ID, MASCOT_COINS,
  POSTCARDS_BY_ID, MAX_MAIL,
  SAFE_CHAT, EMOTES,
  filterText, sanitizeName, safeChatText,
  type JoinOptions, type MovePayload, type ChatPayload, type SafechatPayload,
  type EmotePayload, type EquipPayload, type BuyPayload, type MinigameResultPayload,
  type IglooPlacePayload, type IglooRemovePayload, type SettlePayload,
  type WelcomePayload, type ClothingSlot, type SolClaimResultPayload, type SolFaucetStatus,
  type AdoptPufflePayload, type SetPufflePayload, type PufflesPayload,
  type PuffleActionPayload, type CollectPinPayload,
  type RequestCardPayload, type FriendActionPayload, type CardPayload, type FriendEntry,
  type CardJitsuResultPayload, type ClaimQuestPayload, type QuestProgress, type MeetMascotPayload,
  type SendPostcardPayload, type MailItem,
  type CjChallengePayload, type CjRespondPayload, type CjPlayPayload, type CjQuitPayload, type Card,
} from "../shared";
import * as store from "../services/store.ts";
import * as presence from "../services/presence.ts";
import { makeBotProfile, type BotProfile } from "../services/bots.ts";
import { verifyAuth, authEnforced } from "../services/auth.ts";
import { solana } from "../services/solana.ts";

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

const CJ_HAND = 5;
interface CjMatch {
  id: string; a: string; b: string; aName: string; bName: string;
  aHand: Card[]; bHand: Card[]; aPile: Card[]; bPile: Card[];
  aPlayed: Card | null; bPlayed: Card | null; seq: number;
}
interface CjInvite { from: string; to: string; fromName: string; at: number; }

export class WorldRoom extends Room<WorldState> {
  maxClients = 60;

  private worldId = DEFAULT_WORLD;
  private isIgloo = false;
  private iglooOwner = "";            // persistence key of igloo owner
  private keyBySession = new Map<string, string>(); // sessionId -> store key
  private lastMinigameAt = new Map<string, number>();
  private solClaiming = new Set<string>(); // sessionIds with a SOL claim in flight
  private furnitureSeq = 0;
  private bots = new Map<string, BotProfile>(); // botId -> profile
  private mascots = new Map<string, string>();  // mascotSessionId -> mascot id
  private cjMatches = new Map<string, CjMatch>();
  private cjInvites = new Map<string, CjInvite>();
  private cjSeq = 0;

  onCreate(options: JoinOptions) {
    const { worldId, roomId } = parseArea(
      options?.area || makeArea(DEFAULT_WORLD, DEFAULT_ROOM),
    );
    this.worldId = worldId;
    this.setState(new WorldState());
    this.state.worldId = worldId;
    this.state.roomId = roomId;

    if (isIglooRoom(roomId)) {
      this.isIgloo = true;
      this.iglooOwner = iglooOwnerKey(roomId);
      this.state.isIgloo = true;
      this.state.roomName = IGLOO_DEF.name;
      const owner = store.get(this.iglooOwner);
      this.state.iglooOwnerName = owner?.name ?? "Penguin";
      if (owner) {
        for (const f of owner.igloo) {
          const inst = new FurnitureInstance();
          inst.id = f.id;
          inst.itemId = f.itemId;
          inst.x = f.x;
          inst.y = f.y;
          this.state.furniture.set(f.id, inst);
          const n = parseInt(f.id.split("-")[1] ?? "0", 10);
          if (n >= this.furnitureSeq) this.furnitureSeq = n + 1;
        }
      }
    } else {
      const def = ROOMS[roomId] ?? ROOMS[DEFAULT_ROOM];
      this.state.roomName = def.name;
    }

    this.registerHandlers();
    if (!this.isIgloo) {
      this.spawnBots();
      this.spawnMascot();
      if (this.bots.size > 0 || this.mascots.size > 0) this.clock.setInterval(() => this.tickNpcs(), 1600);
    }
  }

  // ---- ambient bots + mascots ---------------------------------------------
  private spawnBots() {
    const n = 1 + (Math.random() < 0.45 ? 1 : 0); // 1 or 2
    const b = this.bounds();
    for (let i = 0; i < n; i++) {
      const prof = makeBotProfile();
      const id = `bot:${Math.random().toString(36).slice(2, 9)}`;
      const p = new Player();
      p.id = id;
      p.name = prof.name;
      p.x = b.x + Math.random() * b.w;
      p.y = b.y + Math.random() * b.h;
      p.color = prof.color; p.head = prof.head; p.face = prof.face; p.neck = prof.neck;
      p.body = prof.body; p.hand = prof.hand; p.feet = prof.feet;
      this.state.players.set(id, p);
      this.bots.set(id, prof);
    }
  }

  private spawnMascot() {
    const m = mascotForRoom(this.state.roomId);
    if (!m) return;
    const b = this.bounds();
    const id = `mascot:${m.id}`;
    const p = new Player();
    p.id = id;
    p.name = m.name;
    p.x = b.x + b.w * 0.7;
    p.y = b.y + b.h * 0.55;
    p.color = m.color; p.head = m.head; p.face = m.face; p.neck = m.neck;
    p.body = m.body; p.hand = m.hand; p.feet = m.feet;
    this.state.players.set(id, p);
    this.mascots.set(id, m.id);
  }

  private tickNpcs() {
    const b = this.bounds();
    // mascots: mostly idle, occasional tagline + small shuffle
    for (const [sid, mid] of this.mascots) {
      const p = this.state.players.get(sid);
      if (!p) continue;
      if (Math.random() < 0.12) { p.message = MASCOTS_BY_ID[mid]?.tagline ?? "Hi!"; p.msgSeq++; }
      if (Math.random() < 0.25) { const nx = b.x + b.w * (0.35 + Math.random() * 0.3); if (nx !== p.x) p.dir = nx < p.x ? -1 : 1; p.x = nx; }
    }
    for (const id of this.bots.keys()) {
      const p = this.state.players.get(id);
      if (!p) continue;
      if (Math.random() < 0.4) {
        const nx = b.x + Math.random() * b.w;
        const ny = b.y + Math.random() * b.h;
        if (nx !== p.x) p.dir = nx < p.x ? -1 : 1;
        p.x = nx;
        p.y = ny;
      }
      const r = Math.random();
      if (r < 0.08) {
        p.message = SAFE_CHAT[Math.floor(Math.random() * SAFE_CHAT.length)].text;
        p.msgSeq++;
      } else if (r < 0.13) {
        p.emote = EMOTES[Math.floor(Math.random() * EMOTES.length)].id;
        p.emoteSeq++;
      }
    }
  }

  async onAuth(_client: Client, options: JoinOptions) {
    if (authEnforced) {
      const res = await verifyAuth(options?.authToken);
      if (!res) throw new Error("Authentication required");
      return res;
    }
    return true;
  }

  onJoin(client: Client, options: JoinOptions) {
    const wallet = options?.walletAddress?.trim() || null;
    const key = wallet || options?.guestId?.trim() || `guest:${client.sessionId}`;
    const rec = store.getOrCreate(key, wallet, options?.name && sanitizeName(options.name));
    this.keyBySession.set(client.sessionId, key);

    this.resetDailyIfNeeded(rec);
    // track room exploration (public rooms only)
    if (!this.isIgloo && ROOMS[this.state.roomId]) {
      if (!rec.stats.roomsVisited.includes(this.state.roomId)) rec.stats.roomsVisited.push(this.state.roomId);
      if (!rec.daily.roomsVisited.includes(this.state.roomId)) rec.daily.roomsVisited.push(this.state.roomId);
    }
    // daily login bonus
    const now = Date.now();
    let dailyGiven = false;
    if (now - rec.lastDailyBonusAt > DAILY_BONUS_COOLDOWN_MS) {
      rec.lastDailyBonusAt = now;
      this.grant(rec, DAILY_BONUS, DAILY_BONUS);
      dailyGiven = true;
    }
    store.save(rec);

    const p = new Player();
    p.id = client.sessionId;
    p.name = rec.name;
    const spawn = this.spawn();
    p.x = spawn.x;
    p.y = spawn.y;
    for (const slot of CLOTHING_SLOTS) {
      (p as unknown as Record<string, string>)[slot] = rec.outfit[slot] ?? "";
    }
    const activePuffle = rec.puffles.find((pf) => pf.id === rec.activePuffle);
    p.puffle = activePuffle ? activePuffle.type : "";
    this.state.players.set(client.sessionId, p);

    const level = levelForXp(rec.xp);
    const welcome: WelcomePayload = {
      sessionId: client.sessionId,
      name: rec.name,
      coins: rec.coins,
      inventory: rec.inventory,
      walletAddress: rec.walletAddress,
      roomId: this.state.roomId,
      isIglooOwner: this.isIgloo && key === this.iglooOwner,
      level,
      xp: rec.xp,
      rank: rankTitle(level),
      totalEarned: rec.totalEarned,
      stamps: rec.stamps,
      solFaucet: this.solFaucetStatus(rec),
    };
    client.send(S2C.WELCOME, welcome);

    if (dailyGiven) {
      this.sendCoins(client, rec.coins);
      this.sendProgress(client, rec);
      this.notice(client, "success", `🎁 Daily bonus: +${DAILY_BONUS} coins!`);
    }
    presence.setOnline({
      key, name: rec.name, area: makeArea(this.worldId, this.state.roomId), sessionId: client.sessionId,
    });
    this.sendPuffles(client, rec);
    this.sendFriends(client, rec);
    this.sendCardJitsu(client, rec);
    this.sendQuests(client, rec);
    this.sendPins(client, rec);
    this.sendEvent(client, rec);
    this.sendMail(client, rec);
    this.checkStamps(client, rec);
  }

  onLeave(client: Client) {
    const key = this.keyBySession.get(client.sessionId);
    if (key) presence.setOffline(key, client.sessionId);
    this.cleanupCj(client.sessionId);
    this.state.players.delete(client.sessionId);
    this.keyBySession.delete(client.sessionId);
    this.lastMinigameAt.delete(client.sessionId);
  }

  // ---------------------------------------------------------------- handlers
  private registerHandlers() {
    this.onMessage(C2S.MOVE, (client, msg: MovePayload) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || !isFinite(msg?.x) || !isFinite(msg?.y)) return;
      const b = this.bounds();
      const nx = clamp(msg.x, b.x, b.x + b.w);
      const ny = clamp(msg.y, b.y, b.y + b.h);
      if (nx !== p.x) p.dir = nx < p.x ? -1 : 1;
      p.x = nx;
      p.y = ny;
      const key = this.keyBySession.get(client.sessionId);
      const rec = key ? store.get(key) : undefined;
      if (rec && !rec.stats.moved) {
        rec.stats.moved = true;
        store.save(rec);
        this.sendQuests(client, rec);
      }
    });

    this.onMessage(C2S.CHAT, (client, msg: ChatPayload) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      const text = filterText(msg?.text ?? "");
      if (!text) return;
      p.message = text;
      p.msgSeq++;
    });

    this.onMessage(C2S.SAFECHAT, (client, msg: SafechatPayload) => {
      const p = this.state.players.get(client.sessionId);
      if (!p) return;
      const text = safeChatText(msg?.id);
      if (!text) return;
      p.message = text;
      p.msgSeq++;
    });

    this.onMessage(C2S.EMOTE, (client, msg: EmotePayload) => {
      const p = this.state.players.get(client.sessionId);
      if (!p || typeof msg?.id !== "number") return;
      p.emote = msg.id;
      p.emoteSeq++;
    });

    this.onMessage(C2S.EQUIP, (client, msg: EquipPayload) => {
      const p = this.state.players.get(client.sessionId);
      const key = this.keyBySession.get(client.sessionId);
      if (!p || !key) return;
      const rec = store.get(key);
      if (!rec) return;
      const slot = msg?.slot as ClothingSlot;
      const itemId = (msg?.itemId ?? "").toString();
      if (!CLOTHING_SLOTS.includes(slot)) return;
      if (slot === "color" && itemId === "") return; // must always have a color
      if (itemId !== "") {
        const item = ITEMS_BY_ID[itemId];
        if (!item || item.slot !== slot) return;
        if (!rec.inventory.includes(itemId)) {
          return this.notice(client, "error", "You don't own that item.");
        }
      }
      store.setOutfitSlot(rec, slot, itemId);
      (p as unknown as Record<string, string>)[slot] = itemId;
      if (itemId !== "") rec.stats.equips += 1;
      this.checkStamps(client, rec);
      this.sendQuests(client, rec);
    });

    this.onMessage(C2S.BUY, (client, msg: BuyPayload) => {
      const key = this.keyBySession.get(client.sessionId);
      if (!key) return;
      const rec = store.get(key);
      if (!rec) return;
      const id = (msg?.itemId ?? "").toString();
      const item = ITEMS_BY_ID[id] ?? FURNITURE_BY_ID[id];
      if (!item) return this.shopResult(client, false, id, rec.coins, "Unknown item.");
      const name = "name" in item ? item.name : id;
      if (rec.inventory.includes(id)) {
        return this.shopResult(client, false, id, rec.coins, `You already own ${name}.`);
      }
      if (rec.coins < item.price) {
        return this.shopResult(client, false, id, rec.coins, "Not enough coins.");
      }
      rec.coins -= item.price;
      rec.inventory.push(id);
      rec.stats.itemsBought += 1;
      store.save(rec);
      this.shopResult(client, true, id, rec.coins, `Bought ${name}!`);
      this.sendCoins(client, rec.coins);
      this.checkStamps(client, rec);
      this.sendQuests(client, rec);
    });

    this.onMessage(C2S.MINIGAME_RESULT, (client, msg: MinigameResultPayload) => {
      const key = this.keyBySession.get(client.sessionId);
      if (!key) return;
      const rec = store.get(key);
      if (!rec) return;
      const rule = MINIGAME_PAYOUTS[msg?.game];
      if (!rule) return;
      // light anti-spam: one payout per 3s per session
      const now = Date.now();
      const last = this.lastMinigameAt.get(client.sessionId) ?? 0;
      if (now - last < 3000) {
        return this.notice(client, "error", "Slow down! Try again in a moment.");
      }
      this.lastMinigameAt.set(client.sessionId, now);
      const score = clamp(Math.floor(msg?.score ?? 0), 0, 100000);
      rec.stats.minigameRounds += 1;
      rec.daily.minigamePlays += 1;
      if (score > rec.stats.bestScore) rec.stats.bestScore = score;
      const award = Math.min(rule.max, Math.floor(score * rule.perScore));
      if (award > 0) {
        this.earn(client, rec, award, award);
        this.notice(client, "success", `+${award} coins from ${rule.label}!`);
      } else {
        this.flush(client, rec);
      }
      this.checkStamps(client, rec);
      this.sendQuests(client, rec);
    });

    this.onMessage(C2S.IGLOO_PLACE, (client, msg: IglooPlacePayload) => {
      if (!this.guardIglooOwner(client)) return;
      const key = this.keyBySession.get(client.sessionId)!;
      const rec = store.get(key)!;
      const fdef = FURNITURE_BY_ID[(msg?.furnitureId ?? "").toString()];
      if (!fdef) return;
      if (!rec.inventory.includes(fdef.id)) {
        return this.notice(client, "error", "Buy this furniture first.");
      }
      const b = this.bounds();
      const x = clamp(Math.round(msg.x), b.x, b.x + b.w);
      const y = clamp(Math.round(msg.y), b.y, b.y + b.h);
      const id = `f-${this.furnitureSeq++}`;
      const inst = new FurnitureInstance();
      inst.id = id;
      inst.itemId = fdef.id;
      inst.x = x;
      inst.y = y;
      this.state.furniture.set(id, inst);
      rec.igloo.push({ id, itemId: fdef.id, x, y });
      rec.stats.furniturePlaced += 1;
      store.save(rec);
      this.checkStamps(client, rec);
      this.sendQuests(client, rec);
    });

    this.onMessage(C2S.IGLOO_REMOVE, (client, msg: IglooRemovePayload) => {
      if (!this.guardIglooOwner(client)) return;
      const key = this.keyBySession.get(client.sessionId)!;
      const rec = store.get(key)!;
      const id = (msg?.instanceId ?? "").toString();
      if (!this.state.furniture.has(id)) return;
      this.state.furniture.delete(id);
      rec.igloo = rec.igloo.filter((f) => f.id !== id);
      store.save(rec);
    });

    this.onMessage(C2S.ADOPT_PUFFLE, (client, msg: AdoptPufflePayload) => {
      const key = this.keyBySession.get(client.sessionId);
      if (!key) return;
      const rec = store.get(key);
      if (!rec) return;
      const t = PUFFLE_BY_ID[(msg?.type ?? "").toString()];
      if (!t) return;
      if (rec.puffles.length >= MAX_PUFFLES) {
        return this.notice(client, "error", "You already have the maximum number of puffles.");
      }
      if (rec.coins < t.price) {
        return this.notice(client, "error", "Not enough coins for that puffle.");
      }
      rec.coins -= t.price;
      const id = `pf-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
      rec.puffles.push({ id, type: t.id, name: t.name, hunger: 100, happiness: 100, updatedAt: Date.now(), lastDig: 0 });
      rec.activePuffle = id;
      store.save(rec);
      const p = this.state.players.get(client.sessionId);
      if (p) p.puffle = t.id;
      this.sendCoins(client, rec.coins);
      this.sendPuffles(client, rec);
      this.notice(client, "success", `🐾 You adopted a ${t.name}!`);
      this.checkStamps(client, rec);
      this.sendQuests(client, rec);
    });

    this.onMessage(C2S.SET_PUFFLE, (client, msg: SetPufflePayload) => {
      const key = this.keyBySession.get(client.sessionId);
      if (!key) return;
      const rec = store.get(key);
      if (!rec) return;
      const id = (msg?.id ?? "").toString();
      if (id !== "" && !rec.puffles.some((pf) => pf.id === id)) return;
      rec.activePuffle = id;
      store.save(rec);
      const p = this.state.players.get(client.sessionId);
      const ap = rec.puffles.find((pf) => pf.id === id);
      if (p) p.puffle = ap ? ap.type : "";
      this.sendPuffles(client, rec);
    });

    this.onMessage(C2S.FEED_PUFFLE, (client, msg: PuffleActionPayload) => {
      const rec = this.recFor(client);
      const pf = rec?.puffles.find((x) => x.id === (msg?.id ?? "").toString());
      if (!rec || !pf) return;
      this.decayPuffle(pf);
      pf.hunger = 100;
      store.save(rec);
      this.sendPuffles(client, rec);
      this.notice(client, "success", `🍪 ${pf.name} is full and happy!`);
    });

    this.onMessage(C2S.PLAY_PUFFLE, (client, msg: PuffleActionPayload) => {
      const rec = this.recFor(client);
      const pf = rec?.puffles.find((x) => x.id === (msg?.id ?? "").toString());
      if (!rec || !pf) return;
      this.decayPuffle(pf);
      pf.happiness = 100;
      store.save(rec);
      this.sendPuffles(client, rec);
      this.notice(client, "success", `🎾 ${pf.name} loved playing!`);
    });

    this.onMessage(C2S.DIG_PUFFLE, (client) => {
      const rec = this.recFor(client);
      if (!rec) return;
      const pf = rec.puffles.find((x) => x.id === rec.activePuffle);
      if (!pf) return this.notice(client, "error", "Walk a puffle first (Pet Shop → My Puffles).");
      const now = Date.now();
      if (now - pf.lastDig < 45000) {
        return this.notice(client, "info", `${pf.name} is tired — try again soon.`);
      }
      this.decayPuffle(pf);
      pf.lastDig = now;
      pf.happiness = Math.max(0, pf.happiness - 10);
      const reward = 10 + Math.floor(Math.random() * 21); // 10..30
      this.earn(client, rec, reward, reward);
      this.sendPuffles(client, rec);
      this.sendQuests(client, rec);
      this.notice(client, "success", `🦴 ${pf.name} dug up ${reward} coins!`);
    });

    this.onMessage(C2S.COLLECT_PIN, (client, msg: CollectPinPayload) => {
      const rec = this.recFor(client);
      if (!rec) return;
      const pin = PINS_BY_ID[(msg?.id ?? "").toString()];
      if (!pin || rec.collectedPins.includes(pin.id)) return;
      rec.collectedPins.push(pin.id);
      this.earn(client, rec, pin.coins, pin.coins);
      this.sendPins(client, rec);
      this.notice(client, "success", `📌 Found the ${pin.name}! +${pin.coins} coins`);
      this.checkStamps(client, rec);
    });

    this.onMessage(C2S.REQUEST_CARD, (client, msg: RequestCardPayload) => {
      const myKey = this.keyBySession.get(client.sessionId);
      if (!myKey) return;
      const myRec = store.get(myKey);
      if (!myRec) return;
      const targetSession = (msg?.sessionId ?? "").toString();
      // mascots get a special card
      const mid = this.mascots.get(targetSession);
      if (mid) {
        const m = MASCOTS_BY_ID[mid];
        return client.send(S2C.CARD, {
          key: targetSession, name: m.name, level: 99, rank: "Mascot",
          color: m.color, head: m.head, face: m.face, neck: m.neck, body: m.body, hand: m.hand, feet: m.feet,
          puffle: "", stamps: 0, pins: 0, belt: "Ninja", memberSince: Date.parse("2017-01-01"),
          isSelf: false, isFriend: false, isMascot: true, sessionId: targetSession,
        } as CardPayload);
      }
      // bots get a believable card from their profile
      const bot = this.bots.get(targetSession);
      if (bot) {
        const card: CardPayload = {
          key: targetSession, name: bot.name, level: bot.level, rank: rankTitle(bot.level),
          color: bot.color, head: bot.head, face: bot.face, neck: bot.neck, body: bot.body, hand: bot.hand, feet: bot.feet,
          puffle: "", stamps: bot.stamps, pins: Math.floor(bot.stamps / 3), belt: bot.belt,
          memberSince: bot.memberSince, isSelf: false, isFriend: myRec.friends.includes(targetSession),
          sessionId: targetSession,
        };
        return client.send(S2C.CARD, card);
      }
      const targetKey = this.keyBySession.get(targetSession);
      if (!targetKey) return;
      const t = store.get(targetKey);
      if (!t) return;
      const level = levelForXp(t.xp);
      const ap = t.puffles.find((pf) => pf.id === t.activePuffle);
      const card: CardPayload = {
        key: targetKey, name: t.name, level, rank: rankTitle(level),
        color: t.outfit.color, head: t.outfit.head, face: t.outfit.face, neck: t.outfit.neck,
        body: t.outfit.body, hand: t.outfit.hand, feet: t.outfit.feet,
        puffle: ap ? ap.type : "", stamps: t.stamps.length, pins: t.collectedPins.length,
        belt: beltForWins(t.cardJitsuWins).name, memberSince: t.createdAt,
        isSelf: targetKey === myKey, isFriend: myRec.friends.includes(targetKey),
        sessionId: targetSession,
      };
      client.send(S2C.CARD, card);
    });

    this.onMessage(C2S.SEND_POSTCARD, (client, msg: SendPostcardPayload) => {
      const myKey = this.keyBySession.get(client.sessionId);
      if (!myKey) return;
      const myRec = store.get(myKey);
      if (!myRec) return;
      const toKey = (msg?.toKey ?? "").toString();
      const pc = POSTCARDS_BY_ID[(msg?.type ?? "").toString()];
      if (!pc || !toKey || toKey === myKey) return;
      const target = store.get(toKey);
      if (!target) return this.notice(client, "error", "That penguin doesn't have a mailbox yet.");
      const item: MailItem = {
        id: `m-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        from: myKey, fromName: myRec.name, type: pc.id, at: Date.now(),
      };
      target.mailbox.unshift(item);
      if (target.mailbox.length > MAX_MAIL) target.mailbox.length = MAX_MAIL;
      store.save(target);
      this.notice(client, "success", "📮 Postcard sent!");
      // live delivery if the recipient is in this room
      for (const [sid, k] of this.keyBySession) {
        if (k !== toKey) continue;
        const rc = this.clients.find((c) => c.sessionId === sid);
        if (rc) { rc.send(S2C.MAIL, { items: target.mailbox }); this.notice(rc, "info", `📬 New postcard from ${myRec.name}!`); }
      }
    });

    this.onMessage(C2S.MEET_MASCOT, (client, msg: MeetMascotPayload) => {
      const rec = this.recFor(client);
      if (!rec) return;
      const sid = (msg?.id ?? "").toString();
      const mid = this.mascots.get(sid);
      if (!mid) return;
      if (rec.metMascots.includes(mid)) return this.notice(client, "info", "You already have this autograph!");
      rec.metMascots.push(mid);
      this.earn(client, rec, MASCOT_COINS, MASCOT_COINS);
      this.notice(client, "success", `✍️ You got ${MASCOTS_BY_ID[mid].name}'s autograph! +${MASCOT_COINS} coins`);
      this.checkStamps(client, rec);
    });

    this.onMessage(C2S.ADD_FRIEND, (client, msg: FriendActionPayload) => {
      const myKey = this.keyBySession.get(client.sessionId);
      if (!myKey) return;
      const myRec = store.get(myKey);
      if (!myRec) return;
      const k = (msg?.key ?? "").toString();
      if (!k || k === myKey || !store.get(k)) return;
      if (!myRec.friends.includes(k)) {
        myRec.friends.push(k);
        store.save(myRec);
        this.notice(client, "success", "Friend added!");
      }
      this.sendFriends(client, myRec);
      this.sendQuests(client, myRec);
    });

    this.onMessage(C2S.REMOVE_FRIEND, (client, msg: FriendActionPayload) => {
      const myKey = this.keyBySession.get(client.sessionId);
      if (!myKey) return;
      const myRec = store.get(myKey);
      if (!myRec) return;
      const k = (msg?.key ?? "").toString();
      myRec.friends = myRec.friends.filter((f) => f !== k);
      store.save(myRec);
      this.sendFriends(client, myRec);
    });

    this.onMessage(C2S.CARDJITSU_RESULT, (client, msg: CardJitsuResultPayload) => {
      const key = this.keyBySession.get(client.sessionId);
      if (!key) return;
      const rec = store.get(key);
      if (!rec) return;
      if (!msg?.won) return; // only wins progress belts/coins
      const beforeBelt = beltForWins(rec.cardJitsuWins).index;
      rec.cardJitsuWins += 1;
      rec.daily.cardJitsuWins += 1;
      this.earn(client, rec, CARDJITSU_WIN_COINS, CARDJITSU_WIN_COINS);
      const belt = beltForWins(rec.cardJitsuWins);
      this.sendCardJitsu(client, rec);
      this.notice(client, "success", `🥋 Card-Jitsu win! +${CARDJITSU_WIN_COINS} coins`);
      if (belt.index > beforeBelt) {
        this.notice(client, "success", `🥋 You earned the ${belt.name} belt!`);
      }
      this.checkStamps(client, rec);
      this.sendQuests(client, rec);
    });

    // ---- multiplayer Card-Jitsu ----
    this.onMessage(C2S.CJ_CHALLENGE, (client, msg: CjChallengePayload) => {
      const target = (msg?.target ?? "").toString();
      if (!target || target === client.sessionId) return;
      const tc = this.clientBySid(target);
      if (!tc) return this.notice(client, "error", "That penguin isn't available.");
      for (const m of this.cjMatches.values()) {
        if (m.a === client.sessionId || m.b === client.sessionId || m.a === target || m.b === target) {
          return this.notice(client, "error", "Someone is already in a match.");
        }
      }
      const id = `cj-${Date.now()}-${this.cjSeq++}`;
      const fromName = this.recFor(client)?.name ?? "Penguin";
      this.cjInvites.set(id, { from: client.sessionId, to: target, fromName, at: Date.now() });
      tc.send(S2C.CJ_INVITE, { matchId: id, fromName });
      this.notice(client, "info", "Challenge sent!");
    });

    this.onMessage(C2S.CJ_RESPOND, (client, msg: CjRespondPayload) => {
      const inv = this.cjInvites.get((msg?.matchId ?? "").toString());
      if (!inv || inv.to !== client.sessionId) return;
      this.cjInvites.delete((msg?.matchId ?? "").toString());
      const challenger = this.clientBySid(inv.from);
      if (!challenger) return;
      if (!msg.accept) return this.notice(challenger, "info", "Challenge declined.");
      this.startCjMatch((msg?.matchId ?? "").toString(), inv.from, inv.to);
    });

    this.onMessage(C2S.CJ_PLAY, (client, msg: CjPlayPayload) => {
      const m = this.cjMatches.get((msg?.matchId ?? "").toString());
      if (!m) return;
      const isA = m.a === client.sessionId;
      const isB = m.b === client.sessionId;
      if (!isA && !isB) return;
      if ((isA && m.aPlayed) || (isB && m.bPlayed)) return;
      const hand = isA ? m.aHand : m.bHand;
      const idx = hand.findIndex((c) => c.id === msg.cardId);
      if (idx < 0) return;
      const card = hand.splice(idx, 1)[0];
      if (isA) m.aPlayed = card; else m.bPlayed = card;
      if (m.aPlayed && m.bPlayed) this.resolveCjRound(m);
    });

    this.onMessage(C2S.CJ_QUIT, (client, msg: CjQuitPayload) => {
      const m = this.cjMatches.get((msg?.matchId ?? "").toString());
      if (!m || (m.a !== client.sessionId && m.b !== client.sessionId)) return;
      const otherSid = m.a === client.sessionId ? m.b : m.a;
      this.clientBySid(otherSid)?.send(S2C.CJ_CANCEL, { matchId: m.id, reason: "Your opponent left the match." });
      this.cjMatches.delete(m.id);
    });

    this.onMessage(C2S.CLAIM_QUEST, (client, msg: ClaimQuestPayload) => {
      const key = this.keyBySession.get(client.sessionId);
      if (!key) return;
      const rec = store.get(key);
      if (!rec) return;
      const def = QUESTS_BY_ID[(msg?.id ?? "").toString()];
      if (!def) return;
      const claimed = def.kind === "daily" ? rec.dailyClaimed : rec.claimedQuests;
      if (claimed.includes(def.id)) return;
      if (this.questValue(def.id, rec) < def.goal) return;
      claimed.push(def.id);
      this.earn(client, rec, def.coinReward, def.xp);
      this.notice(client, "success", `✅ Quest complete: ${def.title} (+${def.coinReward} coins)`);
      this.checkStamps(client, rec);
      this.sendQuests(client, rec);
    });

    this.onMessage(C2S.CLAIM_EVENT, (client) => {
      const rec = this.recFor(client);
      if (!rec) return;
      const ev = getActiveEvent();
      if (!ev || rec.claimedEvents.includes(ev.id)) return;
      rec.claimedEvents.push(ev.id);
      if (!rec.inventory.includes(ev.freeItemId)) rec.inventory.push(ev.freeItemId);
      this.earn(client, rec, ev.coins, ev.coins);
      this.shopResult(client, true, ev.freeItemId, rec.coins, `🎉 Claimed your free ${ev.freeItemName}!`);
      this.sendEvent(client, rec);
    });

    this.onMessage(C2S.SETTLE, async (client, msg: SettlePayload) => {
      const key = this.keyBySession.get(client.sessionId);
      if (!key) return;
      const rec = store.get(key);
      if (!rec) return;
      if (!rec.walletAddress) {
        return this.settleResult(client, false, rec.coins, "Connect a Solana wallet to settle.");
      }
      const requested = clamp(Math.floor(msg?.coins ?? 0), 0, rec.coins);
      if (requested < MIN_SETTLE_COINS) {
        return this.settleResult(client, false, rec.coins, `You need at least ${MIN_SETTLE_COINS} coins to settle.`);
      }
      const tokens = Math.floor(requested / COINS_PER_TOKEN);
      if (tokens <= 0) {
        return this.settleResult(client, false, rec.coins, `Not enough for a whole token (${COINS_PER_TOKEN} coins = 1 token).`);
      }
      const spend = tokens * COINS_PER_TOKEN;
      const res = await solana.payout(rec.walletAddress, tokens);
      if (!res.ok) {
        return this.settleResult(client, false, rec.coins, res.message);
      }
      rec.coins -= spend;
      rec.settledTokens += tokens;
      store.save(rec);
      this.sendCoins(client, rec.coins);
      client.send(S2C.SETTLE_RESULT, {
        ok: true, coins: rec.coins, tokens, signature: res.signature,
        message: `Settled ${tokens} COIN to your wallet!`,
      });
    });

    // Daily SOL faucet: a shared 1-SOL/day pool, max 3 claims/player, vested over
    // the day so it spreads across early players + new joiners; hard-capped server-side.
    this.onMessage(C2S.CLAIM_SOL, async (client) => {
      const key = this.keyBySession.get(client.sessionId);
      if (!key) return;
      const rec = store.get(key);
      if (!rec) return;
      const fail = (message: string) =>
        client.send(S2C.SOL_CLAIM_RESULT, {
          ok: false, message, enabled: solana.faucetEnabled,
          claimsLeft: this.solClaimsLeft(rec), poolLeftSol: this.solPoolLeft(),
          claimedTotalSol: (rec.solClaimedLamports ?? 0) / 1_000_000_000,
        } satisfies SolClaimResultPayload);

      if (!solana.faucetEnabled) return fail("SOL rewards aren't live yet — check back soon!");
      if (!rec.walletAddress) return fail("Connect a Solana wallet to claim your SOL reward.");
      if (this.solClaiming.has(client.sessionId)) return; // a claim is already in flight
      this.resetDailyIfNeeded(rec);
      if (this.solClaimsLeft(rec) <= 0) return fail("You've used all your SOL claims today — come back tomorrow!");

      const LAMPORTS = 1_000_000_000;
      const f = store.faucetState();
      const today = new Date().toISOString().slice(0, 10);
      if (f.day !== today) { f.day = today; f.spentLamports = 0; }
      const budget = Math.round(SOL_FAUCET.dailyBudgetSol * LAMPORTS);
      const perClaim = Math.round(SOL_FAUCET.perClaimSol * LAMPORTS);
      if (f.spentLamports + perClaim > budget) return fail("Today's SOL pool is fully claimed — back tomorrow!");
      // linear time-vesting: only a fraction of the pool is unlocked so far today
      const now = new Date();
      const frac = (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds()) / 86400;
      const vested = Math.min(budget, Math.floor(budget * frac));
      if (vested - f.spentLamports < perClaim) return fail("The pool is refilling — try again in a little while.");

      this.solClaiming.add(client.sessionId);
      try {
        const res = await solana.sendSol(rec.walletAddress, SOL_FAUCET.perClaimSol);
        if (!res.ok) return fail(res.message);
        rec.daily.solClaims += 1;
        rec.solClaimedLamports = (rec.solClaimedLamports ?? 0) + perClaim;
        f.spentLamports += perClaim;
        store.save(rec);
        store.persist();
        client.send(S2C.SOL_CLAIM_RESULT, {
          ok: true,
          message: `🎉 Sent ${SOL_FAUCET.perClaimSol} SOL to your wallet!`,
          sol: SOL_FAUCET.perClaimSol, signature: res.signature, enabled: true,
          claimsLeft: this.solClaimsLeft(rec), poolLeftSol: this.solPoolLeft(),
          claimedTotalSol: (rec.solClaimedLamports ?? 0) / 1_000_000_000,
        } satisfies SolClaimResultPayload);
      } finally {
        this.solClaiming.delete(client.sessionId);
      }
    });
  }

  // ---------------------------------------------------------------- helpers
  private solClaimsLeft(rec: store.PlayerRecord): number {
    return Math.max(0, SOL_FAUCET.maxClaimsPerDay - (rec.daily?.solClaims ?? 0));
  }
  private solPoolLeft(): number {
    const f = store.faucetState();
    const today = new Date().toISOString().slice(0, 10);
    const spent = f.day === today ? f.spentLamports : 0;
    return Math.max(0, SOL_FAUCET.dailyBudgetSol - spent / 1_000_000_000);
  }
  private solFaucetStatus(rec: store.PlayerRecord): SolFaucetStatus {
    return {
      enabled: solana.faucetEnabled,
      perClaimSol: SOL_FAUCET.perClaimSol,
      maxClaimsPerDay: SOL_FAUCET.maxClaimsPerDay,
      claimsLeft: this.solClaimsLeft(rec),
      poolLeftSol: this.solPoolLeft(),
      claimedTotalSol: (rec.solClaimedLamports ?? 0) / 1_000_000_000,
    };
  }

  private spawn() {
    if (this.isIgloo) return IGLOO_DEF.spawn;
    return (ROOMS[this.state.roomId] ?? ROOMS[DEFAULT_ROOM]).spawn;
  }
  private bounds() {
    if (this.isIgloo) return IGLOO_DEF.bounds;
    return (ROOMS[this.state.roomId] ?? ROOMS[DEFAULT_ROOM]).bounds;
  }
  private guardIglooOwner(client: Client): boolean {
    if (!this.isIgloo) return false;
    const key = this.keyBySession.get(client.sessionId);
    if (!key || key !== this.iglooOwner) {
      this.notice(client, "error", "This isn't your igloo.");
      return false;
    }
    return true;
  }
  private notice(client: Client, kind: "info" | "error" | "success", message: string) {
    client.send(S2C.NOTICE, { kind, message });
  }
  private sendCoins(client: Client, coins: number) {
    client.send(S2C.COINS, { coins });
  }

  // ---- progression ---------------------------------------------------------
  /** Earn coins: bumps coins, lifetime XP and totalEarned (spending never lowers XP). */
  private grant(rec: store.PlayerRecord, amount: number, xp: number) {
    rec.coins += amount;
    rec.xp += Math.max(0, xp);
    rec.totalEarned += Math.max(0, amount);
  }
  private sendProgress(client: Client, rec: store.PlayerRecord) {
    const level = levelForXp(rec.xp);
    client.send(S2C.PROGRESS, { level, xp: rec.xp, rank: rankTitle(level), totalEarned: rec.totalEarned });
  }
  private decayPuffle(p: store.PuffleRecord) {
    const now = Date.now();
    const mins = (now - p.updatedAt) / 60000;
    if (mins > 0.05) {
      p.hunger = Math.max(0, p.hunger - mins * 0.4);
      p.happiness = Math.max(0, p.happiness - mins * 0.3);
      p.updatedAt = now;
    }
  }
  private sendPuffles(client: Client, rec: store.PlayerRecord) {
    for (const p of rec.puffles) this.decayPuffle(p);
    const payload: PufflesPayload = {
      puffles: rec.puffles.map((p) => ({
        id: p.id, type: p.type, name: p.name,
        hunger: Math.round(p.hunger), happiness: Math.round(p.happiness),
      })),
      active: rec.activePuffle,
    };
    client.send(S2C.PUFFLES, payload);
  }
  private sendPins(client: Client, rec: store.PlayerRecord) {
    client.send(S2C.PINS, { collected: rec.collectedPins });
  }
  private recFor(client: Client): store.PlayerRecord | undefined {
    const key = this.keyBySession.get(client.sessionId);
    return key ? store.get(key) : undefined;
  }
  private sendMail(client: Client, rec: store.PlayerRecord) {
    client.send(S2C.MAIL, { items: rec.mailbox });
  }
  private sendEvent(client: Client, rec: store.PlayerRecord) {
    const ev = getActiveEvent();
    if (!ev) return client.send(S2C.EVENT, { active: false, claimed: false });
    client.send(S2C.EVENT, {
      active: true, id: ev.id, name: ev.name, emoji: ev.emoji, tagline: ev.tagline,
      accent: ev.accent, freeItemName: ev.freeItemName, claimed: rec.claimedEvents.includes(ev.id),
    });
  }
  private sendFriends(client: Client, rec: store.PlayerRecord) {
    const friends: FriendEntry[] = rec.friends.map((k) => {
      const pr = presence.get(k);
      const fr = store.get(k);
      return { key: k, name: fr?.name ?? "Penguin", online: !!pr, area: pr?.area ?? "" };
    });
    client.send(S2C.FRIENDS, { friends });
  }
  private sendCardJitsu(client: Client, rec: store.PlayerRecord) {
    const belt = beltForWins(rec.cardJitsuWins);
    client.send(S2C.CARDJITSU, { wins: rec.cardJitsuWins, belt: belt.index, beltName: belt.name });
  }

  // ---- multiplayer Card-Jitsu helpers --------------------------------------
  private clientBySid(sid: string): Client | undefined {
    return this.clients.find((c) => c.sessionId === sid);
  }
  private makeCjCard(m: CjMatch): Card {
    return { id: m.seq++, element: ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)], value: 2 + Math.floor(Math.random() * 9) };
  }
  private startCjMatch(id: string, aSid: string, bSid: string) {
    const ac = this.clientBySid(aSid), bc = this.clientBySid(bSid);
    if (!ac || !bc) return;
    const m: CjMatch = {
      id, a: aSid, b: bSid,
      aName: this.recFor(ac)?.name ?? "Penguin", bName: this.recFor(bc)?.name ?? "Penguin",
      aHand: [], bHand: [], aPile: [], bPile: [], aPlayed: null, bPlayed: null, seq: 0,
    };
    m.aHand = Array.from({ length: CJ_HAND }, () => this.makeCjCard(m));
    m.bHand = Array.from({ length: CJ_HAND }, () => this.makeCjCard(m));
    this.cjMatches.set(id, m);
    ac.send(S2C.CJ_START, { matchId: id, opponentName: m.bName, hand: m.aHand });
    bc.send(S2C.CJ_START, { matchId: id, opponentName: m.aName, hand: m.bHand });
  }
  private resolveCjRound(m: CjMatch) {
    const a = m.aPlayed!, b = m.bPlayed!;
    let aWon = false, bWon = false;
    if (a.element === b.element) { if (a.value > b.value) aWon = true; else if (b.value > a.value) bWon = true; }
    else if (beats(a.element, b.element)) aWon = true; else bWon = true;
    if (aWon) m.aPile.push(a);
    if (bWon) m.bPile.push(b);
    m.aPlayed = null; m.bPlayed = null;
    m.aHand.push(this.makeCjCard(m));
    m.bHand.push(this.makeCjCard(m));
    const ac = this.clientBySid(m.a), bc = this.clientBySid(m.b);
    ac?.send(S2C.CJ_ROUND, { matchId: m.id, yourCard: a, oppCard: b, result: aWon ? "win" : bWon ? "lose" : "tie", yourPile: m.aPile, oppPile: m.bPile, hand: m.aHand });
    bc?.send(S2C.CJ_ROUND, { matchId: m.id, yourCard: b, oppCard: a, result: bWon ? "win" : aWon ? "lose" : "tie", yourPile: m.bPile, oppPile: m.aPile, hand: m.bHand });
    if (hasWinningSet(m.aPile)) this.endCjMatch(m, m.a);
    else if (hasWinningSet(m.bPile)) this.endCjMatch(m, m.b);
  }
  private endCjMatch(m: CjMatch, winnerSid: string) {
    const ac = this.clientBySid(m.a), bc = this.clientBySid(m.b);
    const aWon = winnerSid === m.a;
    ac?.send(S2C.CJ_END, { matchId: m.id, won: aWon, opponentName: m.bName });
    bc?.send(S2C.CJ_END, { matchId: m.id, won: !aWon, opponentName: m.aName });
    const wc = this.clientBySid(winnerSid);
    const rec = wc ? this.recFor(wc) : undefined;
    if (wc && rec) {
      const before = beltForWins(rec.cardJitsuWins).index;
      rec.cardJitsuWins += 1;
      rec.daily.cardJitsuWins += 1;
      this.earn(wc, rec, CARDJITSU_WIN_COINS, CARDJITSU_WIN_COINS);
      const belt = beltForWins(rec.cardJitsuWins);
      this.sendCardJitsu(wc, rec);
      this.notice(wc, "success", `🥋 You won the match! +${CARDJITSU_WIN_COINS} coins`);
      if (belt.index > before) this.notice(wc, "success", `🥋 You earned the ${belt.name} belt!`);
      this.checkStamps(wc, rec);
      this.sendQuests(wc, rec);
    }
    this.cjMatches.delete(m.id);
  }
  private cleanupCj(sid: string) {
    for (const [id, m] of this.cjMatches) {
      if (m.a === sid || m.b === sid) {
        const otherSid = m.a === sid ? m.b : m.a;
        this.clientBySid(otherSid)?.send(S2C.CJ_CANCEL, { matchId: id, reason: "Your opponent left." });
        this.cjMatches.delete(id);
      }
    }
    for (const [id, inv] of this.cjInvites) {
      if (inv.from === sid || inv.to === sid) this.cjInvites.delete(id);
    }
  }
  private flush(client: Client, rec: store.PlayerRecord) {
    store.save(rec);
    this.sendCoins(client, rec.coins);
    this.sendProgress(client, rec);
  }
  /** Earn coins+XP, count it toward daily totals, and reward + announce level-ups. */
  private earn(client: Client, rec: store.PlayerRecord, coins: number, xp: number) {
    const before = levelForXp(rec.xp);
    this.grant(rec, coins, xp);
    rec.daily.coinsEarned += Math.max(0, coins);
    const after = levelForXp(rec.xp);
    if (after > before) {
      const bonus = levelUpBonus(after);
      rec.coins += bonus;
      rec.totalEarned += bonus;
      this.notice(client, "success", `⭐ Level up! Level ${after} — ${rankTitle(after)} (+${bonus} coins)`);
    }
    this.flush(client, rec);
  }
  private resetDailyIfNeeded(rec: store.PlayerRecord) {
    const today = new Date().toISOString().slice(0, 10);
    if (rec.daily.date !== today) {
      rec.daily = { date: today, minigamePlays: 0, coinsEarned: 0, cardJitsuWins: 0, roomsVisited: [], solClaims: 0 };
      rec.dailyClaimed = [];
    }
  }
  private questValue(id: string, rec: store.PlayerRecord): number {
    const s = rec.stats, d = rec.daily;
    switch (id) {
      case "q_walk": return s.moved ? 1 : 0;
      case "q_game": return s.minigameRounds;
      case "q_shop": return s.itemsBought;
      case "q_dress": return s.equips;
      case "q_explore": return s.roomsVisited.length;
      case "q_puffle": return rec.puffles.length;
      case "q_igloo": return s.furniturePlaced;
      case "q_cardjitsu": return rec.cardJitsuWins;
      case "q_friend": return rec.friends.length;
      case "d_games": return d.minigamePlays;
      case "d_earn": return d.coinsEarned;
      case "d_explore": return d.roomsVisited.length;
      case "d_cardjitsu": return d.cardJitsuWins;
      default: return 0;
    }
  }
  private sendQuests(client: Client, rec: store.PlayerRecord) {
    const quests: QuestProgress[] = QUESTS.map((q) => ({
      id: q.id,
      progress: this.questValue(q.id, rec),
      claimed: (q.kind === "daily" ? rec.dailyClaimed : rec.claimedQuests).includes(q.id),
    }));
    client.send(S2C.QUESTS, { quests });
  }
  /** Award any newly-eligible stamps (loops so coin/level chains resolve). */
  private checkStamps(client: Client, rec: store.PlayerRecord) {
    let awarded = false, changed = true, guard = 0;
    while (changed && guard++ < 30) {
      changed = false;
      for (const s of STAMPS) {
        if (rec.stamps.includes(s.id)) continue;
        if (!this.stampMet(s.id, rec)) continue;
        rec.stamps.push(s.id);
        this.grant(rec, s.coinReward, s.xp);
        client.send(S2C.STAMP, { id: s.id, name: s.name, coinReward: s.coinReward });
        this.notice(client, "success", `🏅 Stamp: ${s.name}${s.coinReward ? ` (+${s.coinReward} coins)` : ""}`);
        awarded = changed = true;
      }
    }
    if (awarded) this.flush(client, rec);
  }
  private stampMet(id: string, rec: store.PlayerRecord): boolean {
    const st = rec.stats;
    const equipped = (["head", "face", "neck", "body", "hand", "feet"] as const)
      .filter((s) => (rec.outfit as unknown as Record<string, string>)[s]).length;
    const level = levelForXp(rec.xp);
    switch (id) {
      case "first_game": return st.minigameRounds >= 1;
      case "high_scorer": return st.bestScore >= 100;
      case "game_master": return st.minigameRounds >= 20;
      case "shopper": return st.itemsBought >= 1;
      case "shopaholic": return rec.inventory.length >= 8;
      case "dressed_up": return equipped >= 3;
      case "wanderer": return st.roomsVisited.length >= 5;
      case "autograph": return rec.metMascots.length >= 3;
      case "globetrotter": return st.roomsVisited.length >= 10;
      case "decorator": return st.furniturePlaced >= 5;
      case "interior_designer": return st.furniturePlaced >= 15;
      case "puffle_pal": return rec.puffles.length >= 1;
      case "pin_collector": return rec.collectedPins.length >= 4;
      case "coins_1000": return rec.totalEarned >= 1000;
      case "coins_5000": return rec.totalEarned >= 5000;
      case "level_10": return level >= 10;
      case "ninja": return rec.cardJitsuWins >= WINS_PER_BELT * 8; // Black belt
      default: return false;
    }
  }
  private shopResult(client: Client, ok: boolean, itemId: string, coins: number, message: string) {
    client.send(S2C.SHOP_RESULT, { ok, itemId, coins, message });
  }
  private settleResult(client: Client, ok: boolean, coins: number, message: string) {
    client.send(S2C.SETTLE_RESULT, { ok, coins, message });
  }
}
