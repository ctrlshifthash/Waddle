import type { WorldScene } from "./scenes/WorldScene";

/** Lets React UI (e.g. the igloo editor) talk to the live Phaser scene. */
export const sceneBridge: { scene: WorldScene | null } = { scene: null };
