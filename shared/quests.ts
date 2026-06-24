// Quests give players clear goals + rewards so the game has direction and
// retention (this is what keeps people on it, like Club Penguin).
//   - "starter" quests are one-time and double as the tutorial (they literally
//     tell a new player what to do: walk, earn, shop, dress up, explore...).
//   - "daily" quests reset every day to bring players back.
// Progress per quest id is computed server-side (see WorldRoom.questProgress).

export type QuestKind = "starter" | "daily";

export interface QuestDef {
  id: string;
  kind: QuestKind;
  title: string;
  desc: string;
  goal: number;
  coinReward: number;
  xp: number;
  icon: string;
}

export const QUESTS: QuestDef[] = [
  // --- Starter (tutorial) ---
  { id: "q_walk", kind: "starter", title: "Take a Waddle", desc: "Click anywhere to walk around", goal: 1, coinReward: 25, xp: 25, icon: "👣" },
  { id: "q_game", kind: "starter", title: "Coin Earner", desc: "Play any minigame to earn coins", goal: 1, coinReward: 50, xp: 50, icon: "🎮" },
  { id: "q_shop", kind: "starter", title: "Go Shopping", desc: "Buy an item from the Shop", goal: 1, coinReward: 50, xp: 50, icon: "🛍️" },
  { id: "q_dress", kind: "starter", title: "Dress Up", desc: "Equip an item in your Closet", goal: 1, coinReward: 50, xp: 50, icon: "👕" },
  { id: "q_explore", kind: "starter", title: "Explorer", desc: "Visit 4 different rooms (use the Map)", goal: 4, coinReward: 75, xp: 75, icon: "🗺️" },
  { id: "q_puffle", kind: "starter", title: "Puffle Pal", desc: "Adopt a puffle at the Pet Shop", goal: 1, coinReward: 75, xp: 75, icon: "🐾" },
  { id: "q_igloo", kind: "starter", title: "Decorator", desc: "Place furniture in your igloo", goal: 1, coinReward: 75, xp: 75, icon: "🏠" },
  { id: "q_cardjitsu", kind: "starter", title: "Card-Jitsu", desc: "Win a Card-Jitsu match at the Dojo", goal: 1, coinReward: 100, xp: 100, icon: "🥋" },
  { id: "q_friend", kind: "starter", title: "Make a Friend", desc: "Click a penguin and add them", goal: 1, coinReward: 75, xp: 75, icon: "👥" },

  // --- Daily (repeatable) ---
  { id: "d_games", kind: "daily", title: "Daily Games", desc: "Play 3 minigames today", goal: 3, coinReward: 100, xp: 100, icon: "🎮" },
  { id: "d_earn", kind: "daily", title: "Daily Earner", desc: "Earn 300 coins today", goal: 300, coinReward: 100, xp: 100, icon: "🪙" },
  { id: "d_explore", kind: "daily", title: "Daily Explorer", desc: "Visit 4 rooms today", goal: 4, coinReward: 75, xp: 75, icon: "🧭" },
  { id: "d_cardjitsu", kind: "daily", title: "Daily Duelist", desc: "Win 2 Card-Jitsu matches today", goal: 2, coinReward: 120, xp: 120, icon: "🥋" },
];

export const QUESTS_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

export interface QuestProgress {
  id: string;
  progress: number;
  claimed: boolean;
}

/** Level-up bonus coins (each level), so ranking up feels rewarding. */
export function levelUpBonus(level: number): number {
  return 25 * level;
}
