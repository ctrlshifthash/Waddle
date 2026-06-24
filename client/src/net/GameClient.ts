import { Client, getStateCallbacks, type Room } from "colyseus.js";
import { WS_URL } from "./endpoint";
import {
  C2S, S2C, DEFAULT_ROOM, DEFAULT_WORLD, iglooRoomId, makeArea, parseArea, QUESTS_BY_ID,
  type JoinOptions, type PlayerView, type FurnitureView,
  type WelcomePayload, type NoticePayload, type ShopResultPayload,
  type SettleResultPayload, type CoinsPayload, type ClothingSlot,
  type SolFaucetStatus, type SolClaimResultPayload,
  type ProgressPayload, type StampPayload, type PufflesPayload, type OwnedPuffle,
  type CardPayload, type FriendsPayload, type FriendEntry, type CardJitsuPayload,
  type QuestsPayload, type QuestProgress, type PinsPayload, type EventPayload,
  type MailItem, type MailPayload,
  type CjInvitePayload, type CjStartPayload, type CjRoundPayload, type CjEndPayload, type CjCancelPayload,
} from "@shared";

export interface Identity {
  name: string;
  walletAddress: string | null;
  guestId: string;
  worldId: string;
  getAuthToken?: () => Promise<string | null>;
}

export type GameEvent =
  | "status" | "welcome" | "coins" | "notice" | "shopResult" | "settleResult"
  | "progress" | "stamp" | "puffles" | "card" | "friends" | "cardjitsu" | "quests" | "pins" | "event" | "mail"
  | "cjInvite" | "cjStart" | "cjRound" | "cjEnd" | "cjCancel" | "solClaim"
  | "roomChanged" | "playerAdd" | "playerChange" | "playerRemove"
  | "furnitureAdd" | "furnitureRemove" | "openShop" | "openMinigame"
  | "openPuffleShop" | "enterIgloo" | "exitIgloo";

type Handler = (payload: any) => void;

function toView(p: any): PlayerView {
  return {
    id: p.id, name: p.name, x: p.x, y: p.y, dir: p.dir,
    color: p.color, head: p.head, face: p.face, neck: p.neck,
    body: p.body, hand: p.hand, feet: p.feet, puffle: p.puffle,
    message: p.message, msgSeq: p.msgSeq, emote: p.emote, emoteSeq: p.emoteSeq,
  };
}

class GameClient {
  private client = new Client(WS_URL);
  private room: Room | null = null;
  private handlers = new Map<GameEvent, Set<Handler>>();
  private identity: Identity | null = null;

  // live snapshot maps so a late-mounting Phaser scene can seed itself
  players = new Map<string, PlayerView>();
  furniture = new Map<string, FurnitureView>();

  // public read-only-ish snapshot the UI reads after events
  sessionId = "";
  status: "idle" | "connecting" | "connected" | "disconnected" | "error" = "idle";
  coins = 0;
  inventory: string[] = [];
  walletAddress: string | null = null;
  level = 1;
  xp = 0;
  rank = "Newcomer";
  totalEarned = 0;
  stamps: string[] = [];
  puffles: OwnedPuffle[] = [];
  activePuffle = "";
  friends: FriendEntry[] = [];
  cardJitsuWins = 0;
  belt = 0;
  beltName = "White";
  quests: QuestProgress[] = [];
  collectedPins: string[] = [];
  event: EventPayload | null = null;
  mail: MailItem[] = [];
  solFaucet: SolFaucetStatus | null = null;
  worldId = DEFAULT_WORLD;
  roomId = DEFAULT_ROOM;
  roomName = "";
  isIgloo = false;
  isIglooOwner = false;
  iglooOwnerName = "";

  // ---- event emitter -------------------------------------------------------
  on(ev: GameEvent, fn: Handler) {
    if (!this.handlers.has(ev)) this.handlers.set(ev, new Set());
    this.handlers.get(ev)!.add(fn);
  }
  off(ev: GameEvent, fn: Handler) {
    this.handlers.get(ev)?.delete(fn);
  }
  private emit(ev: GameEvent, payload?: any) {
    this.handlers.get(ev)?.forEach((fn) => fn(payload));
  }

  get myKey(): string {
    return this.identity?.walletAddress || this.identity?.guestId || "guest";
  }

  /** Number of quests ready to claim (for the HUD badge). */
  get claimableQuests(): number {
    let n = 0;
    for (const q of this.quests) {
      const def = QUESTS_BY_ID[q.id];
      if (def && !q.claimed && q.progress >= def.goal) n++;
    }
    return n;
  }

  // ---- connection ----------------------------------------------------------
  async connect(identity: Identity) {
    this.identity = identity;
    this.walletAddress = identity.walletAddress;
    this.worldId = identity.worldId || DEFAULT_WORLD;
    await this.joinRoom(DEFAULT_ROOM);
  }

  async enterIgloo() {
    await this.joinRoom(iglooRoomId(this.myKey));
    this.emit("enterIgloo");
  }
  async exitIgloo() {
    await this.joinRoom(DEFAULT_ROOM);
    this.emit("exitIgloo");
  }

  /** Leave the world entirely (used by the Home button to return to the landing page). */
  async disconnect() {
    if (this.room) {
      await this.room.leave(true).catch(() => {});
      this.room = null;
    }
    this.players.clear();
    this.furniture.clear();
    this.setStatus("idle");
  }

  async joinRoom(roomId: string) {
    this.setStatus("connecting");
    try {
      if (this.room) {
        await this.room.leave(true).catch(() => {});
        this.room = null;
      }
      // fresh room => clear cached entities before new state replays in
      this.players.clear();
      this.furniture.clear();
      const id = this.identity!;
      const authToken = id.getAuthToken ? await id.getAuthToken().catch(() => null) : null;
      const opts: JoinOptions = {
        area: makeArea(this.worldId, roomId),
        name: id.name,
        walletAddress: id.walletAddress ?? undefined,
        guestId: id.guestId,
        authToken: authToken ?? undefined,
      };
      const room = await this.client.joinOrCreate("world", opts);
      this.room = room;
      this.sessionId = room.sessionId;
      this.roomId = roomId;
      this.wireRoom(room);
      this.setStatus("connected");
    } catch (e) {
      console.error("[net] join failed", e);
      this.setStatus("error");
      this.emit("notice", { kind: "error", message: "Could not connect to the server." });
    }
  }

  private wireRoom(room: Room) {
    const $ = getStateCallbacks(room) as any;

    $(room.state).players.onAdd((p: any, id: string) => {
      const view = toView(p);
      this.players.set(id, view);
      this.emit("playerAdd", { id, view, isSelf: id === this.sessionId });
      $(p).onChange(() => {
        const v = toView(p);
        this.players.set(id, v);
        this.emit("playerChange", { id, view: v });
      });
    });
    $(room.state).players.onRemove((_p: any, id: string) => {
      this.players.delete(id);
      this.emit("playerRemove", { id });
    });
    $(room.state).furniture.onAdd((f: any, id: string) => {
      const view: FurnitureView = { id, itemId: f.itemId, x: f.x, y: f.y };
      this.furniture.set(id, view);
      this.emit("furnitureAdd", view);
    });
    $(room.state).furniture.onRemove((_f: any, id: string) => {
      this.furniture.delete(id);
      this.emit("furnitureRemove", { id });
    });

    room.onMessage(S2C.WELCOME, (m: WelcomePayload) => {
      this.coins = m.coins;
      this.inventory = m.inventory;
      this.walletAddress = m.walletAddress;
      this.isIglooOwner = m.isIglooOwner;
      this.level = m.level;
      this.xp = m.xp;
      this.rank = m.rank;
      this.totalEarned = m.totalEarned ?? 0;
      this.stamps = m.stamps;
      this.solFaucet = m.solFaucet ?? null;
      this.emit("welcome", m);
      this.pushRoomChanged();
    });
    room.onMessage(S2C.PROGRESS, (m: ProgressPayload) => {
      this.level = m.level;
      this.xp = m.xp;
      this.rank = m.rank;
      this.totalEarned = m.totalEarned;
      this.emit("progress", m);
    });
    room.onMessage(S2C.STAMP, (m: StampPayload) => {
      if (!this.stamps.includes(m.id)) this.stamps.push(m.id);
      this.emit("stamp", m);
    });
    room.onMessage(S2C.PUFFLES, (m: PufflesPayload) => {
      this.puffles = m.puffles;
      this.activePuffle = m.active;
      this.emit("puffles", m);
    });
    room.onMessage(S2C.CARD, (m: CardPayload) => this.emit("card", m));
    room.onMessage(S2C.FRIENDS, (m: FriendsPayload) => {
      this.friends = m.friends;
      this.emit("friends", m);
    });
    room.onMessage(S2C.CARDJITSU, (m: CardJitsuPayload) => {
      this.cardJitsuWins = m.wins;
      this.belt = m.belt;
      this.beltName = m.beltName;
      this.emit("cardjitsu", m);
    });
    room.onMessage(S2C.QUESTS, (m: QuestsPayload) => {
      this.quests = m.quests;
      this.emit("quests", m);
    });
    room.onMessage(S2C.PINS, (m: PinsPayload) => {
      this.collectedPins = m.collected;
      this.emit("pins", m);
    });
    room.onMessage(S2C.EVENT, (m: EventPayload) => {
      this.event = m;
      this.emit("event", m);
    });
    room.onMessage(S2C.MAIL, (m: MailPayload) => {
      this.mail = m.items;
      this.emit("mail", m);
    });
    room.onMessage(S2C.CJ_INVITE, (m: CjInvitePayload) => this.emit("cjInvite", m));
    room.onMessage(S2C.CJ_START, (m: CjStartPayload) => this.emit("cjStart", m));
    room.onMessage(S2C.CJ_ROUND, (m: CjRoundPayload) => this.emit("cjRound", m));
    room.onMessage(S2C.CJ_END, (m: CjEndPayload) => this.emit("cjEnd", m));
    room.onMessage(S2C.CJ_CANCEL, (m: CjCancelPayload) => this.emit("cjCancel", m));
    room.onMessage(S2C.COINS, (m: CoinsPayload) => {
      this.coins = m.coins;
      this.emit("coins", m.coins);
    });
    room.onMessage(S2C.SHOP_RESULT, (m: ShopResultPayload) => {
      if (m.ok && !this.inventory.includes(m.itemId)) this.inventory.push(m.itemId);
      this.coins = m.coins;
      this.emit("shopResult", m);
      this.emit("notice", { kind: m.ok ? "success" : "error", message: m.message });
    });
    room.onMessage(S2C.SETTLE_RESULT, (m: SettleResultPayload) => {
      this.coins = m.coins;
      this.emit("settleResult", m);
      this.emit("notice", { kind: m.ok ? "success" : "error", message: m.message });
    });
    room.onMessage(S2C.SOL_CLAIM_RESULT, (m: SolClaimResultPayload) => {
      this.solFaucet = {
        enabled: m.enabled, perClaimSol: this.solFaucet?.perClaimSol ?? m.sol ?? 0,
        maxClaimsPerDay: this.solFaucet?.maxClaimsPerDay ?? 3,
        claimsLeft: m.claimsLeft, poolLeftSol: m.poolLeftSol, claimedTotalSol: m.claimedTotalSol,
      };
      this.emit("solClaim", m);
      this.emit("notice", { kind: m.ok ? "success" : "error", message: m.message });
    });
    room.onMessage(S2C.NOTICE, (m: NoticePayload) => this.emit("notice", m));

    room.onLeave(() => this.setStatus("disconnected"));
    room.onError((code, message) => {
      console.error("[net] room error", code, message);
      this.emit("notice", { kind: "error", message: message || "Connection error." });
    });

    // Room state (roomName/isIgloo) is delivered with the initial sync.
    this.pushRoomChanged();
  }

  private pushRoomChanged() {
    if (!this.room) return;
    const s: any = this.room.state;
    this.roomId = s.roomId || this.roomId;
    this.roomName = s.roomName || "";
    this.isIgloo = !!s.isIgloo;
    this.iglooOwnerName = s.iglooOwnerName || "";
    this.emit("roomChanged", {
      roomId: this.roomId, roomName: this.roomName,
      isIgloo: this.isIgloo, isIglooOwner: this.isIglooOwner,
      iglooOwnerName: this.iglooOwnerName,
    });
  }

  private setStatus(s: GameClient["status"]) {
    this.status = s;
    this.emit("status", s);
  }

  // ---- outbound messages ---------------------------------------------------
  move(x: number, y: number) { this.room?.send(C2S.MOVE, { x, y }); }
  chat(text: string) { this.room?.send(C2S.CHAT, { text }); }
  safechat(id: number) { this.room?.send(C2S.SAFECHAT, { id }); }
  emote(id: number) { this.room?.send(C2S.EMOTE, { id }); }
  equip(slot: ClothingSlot, itemId: string) { this.room?.send(C2S.EQUIP, { slot, itemId }); }
  buy(itemId: string) { this.room?.send(C2S.BUY, { itemId }); }
  minigameResult(game: string, score: number) { this.room?.send(C2S.MINIGAME_RESULT, { game, score }); }
  iglooPlace(furnitureId: string, x: number, y: number) { this.room?.send(C2S.IGLOO_PLACE, { furnitureId, x, y }); }
  iglooRemove(instanceId: string) { this.room?.send(C2S.IGLOO_REMOVE, { instanceId }); }
  settle(coins: number) { this.room?.send(C2S.SETTLE, { coins }); }
  claimSol() { this.room?.send(C2S.CLAIM_SOL); }
  adoptPuffle(type: string) { this.room?.send(C2S.ADOPT_PUFFLE, { type }); }
  setPuffle(id: string) { this.room?.send(C2S.SET_PUFFLE, { id }); }
  feedPuffle(id: string) { this.room?.send(C2S.FEED_PUFFLE, { id }); }
  playPuffle(id: string) { this.room?.send(C2S.PLAY_PUFFLE, { id }); }
  digPuffle() { this.room?.send(C2S.DIG_PUFFLE, {}); }
  collectPin(id: string) { this.room?.send(C2S.COLLECT_PIN, { id }); }
  cardJitsuResult(won: boolean) { this.room?.send(C2S.CARDJITSU_RESULT, { won }); }
  claimQuest(id: string) { this.room?.send(C2S.CLAIM_QUEST, { id }); }
  claimEvent() { this.room?.send(C2S.CLAIM_EVENT, {}); }
  requestCard(sessionId: string) { this.room?.send(C2S.REQUEST_CARD, { sessionId }); }
  meetMascot(id: string) { this.room?.send(C2S.MEET_MASCOT, { id }); }
  sendPostcard(toKey: string, type: string) { this.room?.send(C2S.SEND_POSTCARD, { toKey, type }); }
  cjChallenge(target: string) { this.room?.send(C2S.CJ_CHALLENGE, { target }); }
  cjRespond(matchId: string, accept: boolean) { this.room?.send(C2S.CJ_RESPOND, { matchId, accept }); }
  cjPlay(matchId: string, cardId: number) { this.room?.send(C2S.CJ_PLAY, { matchId, cardId }); }
  cjQuit(matchId: string) { this.room?.send(C2S.CJ_QUIT, { matchId }); }
  addFriend(key: string) { this.room?.send(C2S.ADD_FRIEND, { key }); }
  removeFriend(key: string) { this.room?.send(C2S.REMOVE_FRIEND, { key }); }
  async jumpTo(area: string) {
    if (!area) return;
    const { worldId, roomId } = parseArea(area);
    this.worldId = worldId;
    await this.joinRoom(roomId);
  }

  // ui-trigger helpers (Phaser -> React)
  openShop() { this.emit("openShop"); }
  openMinigame(id: string) { this.emit("openMinigame", id); }
  openPuffleShop() { this.emit("openPuffleShop"); }
}

export const game = new GameClient();
