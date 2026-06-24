export * from "./protocol";
export * from "./rooms";
export * from "./items";
export * from "./safechat";
export * from "./economy";
export * from "./progression";
export * from "./stamps";
export * from "./puffles";
export * from "./cardjitsu";
export * from "./quests";
export * from "./pins";
export * from "./servers";
export * from "./events";
export * from "./mascots";
export * from "./postcards";

/** Plain shape of a player as decoded by colyseus.js on the client. */
export interface PlayerView {
  id: string;
  name: string;
  x: number;
  y: number;
  dir: number; // -1 facing left, 1 facing right
  color: string;
  head: string;
  face: string;
  neck: string;
  body: string;
  hand: string;
  feet: string;
  puffle: string; // active puffle type id ("" = none)
  message: string;
  msgSeq: number;
  emote: number;
  emoteSeq: number;
}

/** Plain shape of an igloo furniture instance as decoded on the client. */
export interface FurnitureView {
  id: string;       // instance id
  itemId: string;   // catalog id
  x: number;
  y: number;
}
