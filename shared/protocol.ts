// Network message contract shared by the Colyseus server and the colyseus.js
// client. Continuous state (positions, appearance, chat bubbles, igloo furniture)
// flows through the synced room schema; the messages below are one-off events.

import type { ClothingSlot } from "./items";
import type { Card } from "./cardjitsu";

/** Client -> Server */
export const C2S = {
  MOVE: "move",
  CHAT: "chat",
  SAFECHAT: "safechat",
  EMOTE: "emote",
  EQUIP: "equip",
  BUY: "buy",
  MINIGAME_RESULT: "minigame_result",
  IGLOO_PLACE: "igloo_place",
  IGLOO_REMOVE: "igloo_remove",
  SETTLE: "settle",
  CLAIM_SOL: "claim_sol",
  ADOPT_PUFFLE: "adopt_puffle",
  SET_PUFFLE: "set_puffle",
  FEED_PUFFLE: "feed_puffle",
  PLAY_PUFFLE: "play_puffle",
  DIG_PUFFLE: "dig_puffle",
  COLLECT_PIN: "collect_pin",
  REQUEST_CARD: "request_card",
  MEET_MASCOT: "meet_mascot",
  ADD_FRIEND: "add_friend",
  REMOVE_FRIEND: "remove_friend",
  CARDJITSU_RESULT: "cardjitsu_result",
  CLAIM_QUEST: "claim_quest",
  CLAIM_EVENT: "claim_event",
  SEND_POSTCARD: "send_postcard",
  CJ_CHALLENGE: "cj_challenge",
  CJ_RESPOND: "cj_respond",
  CJ_PLAY: "cj_play",
  CJ_QUIT: "cj_quit",
} as const;

/** Server -> Client */
export const S2C = {
  WELCOME: "welcome",
  COINS: "coins",
  SHOP_RESULT: "shop_result",
  SETTLE_RESULT: "settle_result",
  SOL_CLAIM_RESULT: "sol_claim_result",
  NOTICE: "notice",
  PROGRESS: "progress",
  STAMP: "stamp",
  PUFFLES: "puffles",
  CARD: "card",
  FRIENDS: "friends",
  CARDJITSU: "cardjitsu",
  QUESTS: "quests",
  PINS: "pins",
  EVENT: "event",
  MAIL: "mail",
  CJ_INVITE: "cj_invite",
  CJ_START: "cj_start",
  CJ_ROUND: "cj_round",
  CJ_END: "cj_end",
  CJ_CANCEL: "cj_cancel",
} as const;

export interface MovePayload { x: number; y: number; }
export interface ChatPayload { text: string; }
export interface SafechatPayload { id: number; }
export interface EmotePayload { id: number; }
export interface EquipPayload { slot: ClothingSlot; itemId: string; } // "" clears the slot
export interface BuyPayload { itemId: string; }
export interface MinigameResultPayload { game: string; score: number; }
export interface IglooPlacePayload { furnitureId: string; x: number; y: number; }
export interface IglooRemovePayload { instanceId: string; }
export interface SettlePayload { coins: number; }

export interface SolFaucetStatus {
  enabled: boolean;
  perClaimSol: number;
  maxClaimsPerDay: number;
  claimsLeft: number;
  poolLeftSol: number;
  claimedTotalSol: number; // cumulative SOL this player has claimed
}
export interface SolClaimResultPayload {
  ok: boolean;
  message: string;
  sol?: number;
  signature?: string;
  claimsLeft: number;
  poolLeftSol: number;
  claimedTotalSol: number;
  enabled: boolean;
}

export interface WelcomePayload {
  sessionId: string;
  name: string;
  coins: number;
  inventory: string[];
  walletAddress: string | null;
  roomId: string;
  isIglooOwner: boolean;
  level: number;
  xp: number;
  rank: string;
  totalEarned: number;
  stamps: string[];
  solFaucet?: SolFaucetStatus;
}

export interface CoinsPayload { coins: number; }
export interface ProgressPayload { level: number; xp: number; rank: string; totalEarned: number; }
export interface StampPayload { id: string; name: string; coinReward: number; }
export interface AdoptPufflePayload { type: string; }
export interface SetPufflePayload { id: string; }
export interface PuffleActionPayload { id: string; }
export interface OwnedPuffle { id: string; type: string; name: string; hunger: number; happiness: number; }
export interface PufflesPayload { puffles: OwnedPuffle[]; active: string; }
export interface CollectPinPayload { id: string; }
export interface PinsPayload { collected: string[]; }

export interface RequestCardPayload { sessionId: string; }
export interface FriendActionPayload { key: string; }
export interface CardPayload {
  key: string;
  name: string;
  level: number;
  rank: string;
  color: string;
  head: string; face: string; neck: string; body: string; hand: string; feet: string;
  puffle: string;
  stamps: number;
  pins: number;
  belt: string;
  memberSince: number;
  isSelf: boolean;
  isFriend: boolean;
  isMascot?: boolean;
  sessionId?: string; // target's live session (for challenges); absent/special for bots/mascots
}
export interface MeetMascotPayload { id: string; }
export interface FriendEntry { key: string; name: string; online: boolean; area: string; }
export interface FriendsPayload { friends: FriendEntry[]; }
export interface CardJitsuResultPayload { won: boolean; }
export interface CardJitsuPayload { wins: number; belt: number; beltName: string; }
export interface ClaimQuestPayload { id: string; }
export interface QuestsPayload { quests: { id: string; progress: number; claimed: boolean }[]; }
export interface EventPayload {
  active: boolean;
  id?: string; name?: string; emoji?: string; tagline?: string; accent?: string; freeItemName?: string;
  claimed: boolean;
}
export interface MailItem { id: string; from: string; fromName: string; type: string; at: number; }
export interface SendPostcardPayload { toKey: string; type: string; }
export interface MailPayload { items: MailItem[]; }

// ---- Multiplayer Card-Jitsu ----
export interface CjChallengePayload { target: string; }
export interface CjRespondPayload { matchId: string; accept: boolean; }
export interface CjPlayPayload { matchId: string; cardId: number; }
export interface CjQuitPayload { matchId: string; }
export interface CjInvitePayload { matchId: string; fromName: string; }
export interface CjStartPayload { matchId: string; opponentName: string; hand: Card[]; }
export interface CjRoundPayload {
  matchId: string; yourCard: Card; oppCard: Card;
  result: "win" | "lose" | "tie"; yourPile: Card[]; oppPile: Card[]; hand: Card[];
}
export interface CjEndPayload { matchId: string; won: boolean; opponentName: string; }
export interface CjCancelPayload { matchId: string; reason: string; }
export interface ShopResultPayload { ok: boolean; itemId: string; coins: number; message: string; }
export interface SettleResultPayload { ok: boolean; coins: number; tokens?: number; signature?: string; message: string; }
export interface NoticePayload { kind: "info" | "error" | "success"; message: string; }

/** Options sent when joining a Colyseus room. */
export interface JoinOptions {
  /**
   * Which world room to join ("town", "dock", "igloo:<key>", ...). Named `area`
   * (not `roomId`) because Colyseus reserves `roomId` as an internal matchmaking
   * key — using it for filterBy() would be silently ignored.
   */
  area: string;
  /** Privy auth/identity token for server-side verification (optional in dev). */
  authToken?: string;
  /** Wallet address (used as the persistence key when present). */
  walletAddress?: string;
  /** Stable per-browser id for guests so their progress + igloo persist. */
  guestId?: string;
  name?: string;
}
