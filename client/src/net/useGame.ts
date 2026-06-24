import { useEffect, useReducer } from "react";
import { game, type GameEvent } from "./GameClient";

const SNAP_EVENTS: GameEvent[] = [
  "status", "welcome", "coins", "roomChanged", "settleResult", "shopResult", "solClaim",
  "progress", "stamp", "puffles", "friends", "cardjitsu", "quests", "pins", "event", "mail",
];

/** Re-renders the component whenever core game state changes; returns the singleton. */
export function useGame() {
  const [, force] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    const fn = () => force();
    SNAP_EVENTS.forEach((e) => game.on(e, fn));
    return () => SNAP_EVENTS.forEach((e) => game.off(e, fn));
  }, []);
  return game;
}
