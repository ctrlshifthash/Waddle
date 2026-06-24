// Stamps = achievements. Conditions are evaluated server-side against a player's
// record/stats (see server checkStamps). Earning a stamp grants coins + XP.

export type StampCategory = "Games" | "Style" | "Explore" | "Igloo" | "Social" | "Puffles";

export interface Stamp {
  id: string;
  name: string;
  description: string;
  category: StampCategory;
  coinReward: number;
  xp: number;
}

export const STAMPS: Stamp[] = [
  { id: "first_game", name: "First Steps", description: "Play a minigame", category: "Games", coinReward: 50, xp: 50 },
  { id: "high_scorer", name: "High Scorer", description: "Score 100+ in a minigame", category: "Games", coinReward: 120, xp: 120 },
  { id: "game_master", name: "Game Master", description: "Play 20 minigame rounds", category: "Games", coinReward: 200, xp: 200 },
  { id: "ninja", name: "Ninja", description: "Reach the Black belt in Card-Jitsu", category: "Games", coinReward: 400, xp: 200 },

  { id: "shopper", name: "Shopper", description: "Buy your first item", category: "Style", coinReward: 25, xp: 25 },
  { id: "shopaholic", name: "Shopaholic", description: "Own 8 items", category: "Style", coinReward: 100, xp: 100 },
  { id: "dressed_up", name: "Dressed Up", description: "Wear items in 3 slots at once", category: "Style", coinReward: 60, xp: 60 },

  { id: "wanderer", name: "Wanderer", description: "Visit 5 different rooms", category: "Explore", coinReward: 75, xp: 75 },
  { id: "autograph", name: "Autograph Hunter", description: "Meet 3 mascots", category: "Social", coinReward: 200, xp: 150 },
  { id: "globetrotter", name: "Globetrotter", description: "Visit every room on the island", category: "Explore", coinReward: 200, xp: 200 },

  { id: "decorator", name: "Decorator", description: "Place 5 furniture in your igloo", category: "Igloo", coinReward: 80, xp: 80 },
  { id: "interior_designer", name: "Interior Designer", description: "Place 15 furniture", category: "Igloo", coinReward: 150, xp: 150 },

  { id: "puffle_pal", name: "Puffle Pal", description: "Adopt a puffle", category: "Puffles", coinReward: 60, xp: 60 },
  { id: "pin_collector", name: "Pin Collector", description: "Find 4 hidden pins", category: "Explore", coinReward: 150, xp: 100 },

  { id: "coins_1000", name: "Getting Rich", description: "Earn 1,000 coins in total", category: "Social", coinReward: 100, xp: 100 },
  { id: "coins_5000", name: "Coin Tycoon", description: "Earn 5,000 coins in total", category: "Social", coinReward: 300, xp: 300 },
  { id: "level_10", name: "Local Hero", description: "Reach level 10", category: "Social", coinReward: 300, xp: 0 },
];

export const STAMPS_BY_ID: Record<string, Stamp> = Object.fromEntries(STAMPS.map((s) => [s.id, s]));
export const TOTAL_STAMPS = STAMPS.length;
