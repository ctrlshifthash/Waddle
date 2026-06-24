import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") id = "";
  @type("string") name = "Penguin";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") dir = 1; // -1 left, 1 right
  // appearance — field names match the ClothingSlot ids exactly
  @type("string") color = "color_blue";
  @type("string") head = "";
  @type("string") face = "";
  @type("string") neck = "";
  @type("string") body = "";
  @type("string") hand = "";
  @type("string") feet = "";
  @type("string") puffle = ""; // active puffle type id ("" = none)
  // transient chat bubble: clients render `message` when `msgSeq` changes
  @type("string") message = "";
  @type("number") msgSeq = 0;
  // transient emote: clients play `emote` when `emoteSeq` changes
  @type("number") emote = -1;
  @type("number") emoteSeq = 0;
}

export class FurnitureInstance extends Schema {
  @type("string") id = "";      // unique instance id
  @type("string") itemId = "";  // catalog id (FURNITURE_BY_ID)
  @type("number") x = 0;
  @type("number") y = 0;
}

export class WorldState extends Schema {
  @type("string") worldId = "";
  @type("string") roomId = "";
  @type("string") roomName = "";
  @type("boolean") isIgloo = false;
  @type("string") iglooOwnerName = "";
  @type({ map: Player }) players = new MapSchema<Player>();
  @type({ map: FurnitureInstance }) furniture = new MapSchema<FurnitureInstance>();
}
