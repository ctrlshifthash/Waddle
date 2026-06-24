import { JSONFilePreset } from "lowdb/node";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  STARTING_COINS,
  DEFAULT_OUTFIT,
  STARTER_ITEMS,
  type ClothingSlot,
  type MailItem,
} from "../shared";

export interface Outfit {
  color: string;
  head: string;
  face: string;
  neck: string;
  body: string;
  hand: string;
  feet: string;
}

export interface IglooItem {
  id: string;     // instance id
  itemId: string; // catalog id
  x: number;
  y: number;
}

export interface PlayerStats {
  itemsBought: number;
  roomsVisited: string[];
  furniturePlaced: number;
  minigameRounds: number;
  bestScore: number;
  moved: boolean;
  equips: number;
}

export interface DailyCounters {
  date: string;
  minigamePlays: number;
  coinsEarned: number;
  cardJitsuWins: number;
  roomsVisited: string[];
  solClaims: number;
}

function freshDaily(date = ""): DailyCounters {
  return { date, minigamePlays: 0, coinsEarned: 0, cardJitsuWins: 0, roomsVisited: [], solClaims: 0 };
}

export interface PuffleRecord {
  id: string;
  type: string;
  name: string;
  hunger: number;     // 0..100
  happiness: number;  // 0..100
  updatedAt: number;  // for time decay
  lastDig: number;    // dig cooldown
}

export interface PlayerRecord {
  key: string;
  name: string;
  walletAddress: string | null;
  coins: number;
  inventory: string[]; // owned clothing + furniture ids
  outfit: Outfit;
  igloo: IglooItem[];
  settledTokens: number;
  solClaimedLamports: number; // cumulative native SOL claimed from the daily pool
  // progression
  xp: number;
  totalEarned: number;
  stamps: string[];
  stats: PlayerStats;
  puffles: PuffleRecord[];
  activePuffle: string; // owned puffle instance id ("" = none)
  friends: string[];    // friend persistence keys
  cardJitsuWins: number;
  collectedPins: string[];
  claimedEvents: string[];
  metMascots: string[];
  mailbox: MailItem[];
  daily: DailyCounters;
  claimedQuests: string[];
  dailyClaimed: string[];
  lastDailyBonusAt: number;
  createdAt: number;
  updatedAt: number;
}

function freshStats(): PlayerStats {
  return { itemsBought: 0, roomsVisited: [], furniturePlaced: 0, minigameRounds: 0, bestScore: 0, moved: false, equips: 0 };
}

/** Global daily SOL-faucet pool state (shared across all players). */
export interface FaucetState {
  day: string;          // UTC date the pool is tracking
  spentLamports: number; // total SOL (in lamports) paid out this day
}

interface DbData {
  players: Record<string, PlayerRecord>;
  faucet?: FaucetState;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// DATA_DIR lets a host (Render disk / Railway volume) point persistence at a
// durable path so player progress + the faucet cap survive restarts.
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, "../../data");
const DB_FILE = path.join(DATA_DIR, "db.json");

let db: Awaited<ReturnType<typeof JSONFilePreset<DbData>>>;
let writeQueued = false;

export async function initStore(): Promise<void> {
  mkdirSync(DATA_DIR, { recursive: true });
  db = await JSONFilePreset<DbData>(DB_FILE, { players: {} });
  await db.read();
  if (!db.data.players) db.data.players = {};
}

/** Debounced persistence — many mutations, one disk write per tick. */
export function persist(): void {
  if (writeQueued) return;
  writeQueued = true;
  setTimeout(() => {
    writeQueued = false;
    db.write().catch((e) => console.error("[store] write failed:", e));
  }, 250);
}

export function getOrCreate(
  key: string,
  walletAddress: string | null,
  name?: string,
): PlayerRecord {
  let rec = db.data.players[key];
  const now = Date.now();
  if (!rec) {
    rec = {
      key,
      name: name?.trim() || "Penguin",
      walletAddress,
      coins: STARTING_COINS,
      inventory: [...STARTER_ITEMS],
      outfit: { ...DEFAULT_OUTFIT },
      igloo: [],
      settledTokens: 0,
      solClaimedLamports: 0,
      xp: 0,
      totalEarned: 0,
      stamps: [],
      stats: freshStats(),
      puffles: [],
      activePuffle: "",
      friends: [],
      cardJitsuWins: 0,
      collectedPins: [],
      claimedEvents: [],
      metMascots: [],
      mailbox: [],
      daily: freshDaily(),
      claimedQuests: [],
      dailyClaimed: [],
      lastDailyBonusAt: 0,
      createdAt: now,
      updatedAt: now,
    };
    db.data.players[key] = rec;
    persist();
  } else {
    // keep wallet/name fresh on reconnect
    if (walletAddress) rec.walletAddress = walletAddress;
    if (name && name.trim()) rec.name = name.trim();
    // backfill fields added in later versions
    if (rec.xp == null) rec.xp = 0;
    if (rec.totalEarned == null) rec.totalEarned = Math.max(0, rec.coins - STARTING_COINS);
    if (!rec.stamps) rec.stamps = [];
    if (!rec.stats) rec.stats = freshStats();
    if (rec.stats.moved == null) rec.stats.moved = false;
    if (rec.stats.equips == null) rec.stats.equips = 0;
    if (!rec.puffles) rec.puffles = [];
    for (const pf of rec.puffles) {
      if (pf.hunger == null) pf.hunger = 100;
      if (pf.happiness == null) pf.happiness = 100;
      if (pf.updatedAt == null) pf.updatedAt = Date.now();
      if (pf.lastDig == null) pf.lastDig = 0;
    }
    if (rec.activePuffle == null) rec.activePuffle = "";
    if (!rec.friends) rec.friends = [];
    if (!rec.collectedPins) rec.collectedPins = [];
    if (!rec.claimedEvents) rec.claimedEvents = [];
    if (!rec.metMascots) rec.metMascots = [];
    if (!rec.mailbox) rec.mailbox = [];
    if (rec.cardJitsuWins == null) rec.cardJitsuWins = 0;
    if (rec.solClaimedLamports == null) rec.solClaimedLamports = 0;
    if (!rec.daily) rec.daily = freshDaily();
    if (rec.daily.solClaims == null) rec.daily.solClaims = 0;
    if (!rec.claimedQuests) rec.claimedQuests = [];
    if (!rec.dailyClaimed) rec.dailyClaimed = [];
    if (rec.lastDailyBonusAt == null) rec.lastDailyBonusAt = 0;
    rec.updatedAt = now;
  }
  return rec;
}

export function get(key: string): PlayerRecord | undefined {
  return db.data.players[key];
}

/** The shared SOL-faucet pool record (created on first use). */
export function faucetState(): FaucetState {
  if (!db.data.faucet) db.data.faucet = { day: "", spentLamports: 0 };
  return db.data.faucet;
}

export function setOutfitSlot(rec: PlayerRecord, slot: ClothingSlot, itemId: string): void {
  (rec.outfit as unknown as Record<string, string>)[slot] = itemId;
  rec.updatedAt = Date.now();
  persist();
}

export function save(rec?: PlayerRecord): void {
  if (rec) rec.updatedAt = Date.now();
  persist();
}
