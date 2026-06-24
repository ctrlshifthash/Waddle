// Progression: XP accrues whenever a player EARNS coins (minigames, stamps,
// bonuses) and never decreases when they spend. Level is derived from XP.

export const XP_PER_LEVEL = 500;
export const DAILY_BONUS = 100;
export const DAILY_BONUS_COOLDOWN_MS = 20 * 60 * 60 * 1000; // 20h

export function levelForXp(xp: number): number {
  return 1 + Math.floor(Math.max(0, xp) / XP_PER_LEVEL);
}

export function xpIntoLevel(xp: number): { into: number; needed: number } {
  return { into: Math.max(0, xp) % XP_PER_LEVEL, needed: XP_PER_LEVEL };
}

export function rankTitle(level: number): string {
  if (level >= 40) return "Legend";
  if (level >= 20) return "Veteran";
  if (level >= 10) return "Local";
  if (level >= 5) return "Explorer";
  return "Newcomer";
}
