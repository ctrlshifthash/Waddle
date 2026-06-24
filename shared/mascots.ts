// Mascots — famous characters that hang out in specific rooms. Click one and grab
// their autograph for coins + a stamp. (Outfits use existing catalog item ids.)

export interface Mascot {
  id: string;
  name: string;
  room: string;
  tagline: string;
  color: string; head: string; face: string; neck: string; body: string; hand: string; feet: string;
}

export const MASCOTS: Mascot[] = [
  { id: "aunt_arctic", name: "Aunt Arctic", room: "town", tagline: "Stay curious, penguins!",
    color: "color_purple", head: "head_beanie", face: "face_shades", neck: "", body: "", hand: "", feet: "" },
  { id: "rockhopper", name: "Rockhopper", room: "dock", tagline: "Arrr! Welcome aboard, matey!",
    color: "color_red", head: "head_cowboy", face: "face_eyepatch", neck: "", body: "body_tuxedo", hand: "hand_flag", feet: "feet_boots" },
  { id: "sensei", name: "Sensei", room: "dojo", tagline: "Patience, young ninja.",
    color: "color_black", head: "", face: "", neck: "neck_scarf", body: "", hand: "", feet: "feet_boots" },
  { id: "cadence", name: "Cadence", room: "nightclub", tagline: "Let's dance! 🎶",
    color: "color_pink", head: "head_party", face: "face_3d", neck: "", body: "body_hoodie", hand: "hand_guitar", feet: "" },
  { id: "gary", name: "Gary the Gadget Guy", room: "coffee", tagline: "Science is everything!",
    color: "color_green", head: "", face: "face_3d", neck: "neck_tie", body: "body_raincoat", hand: "", feet: "" },
];

export const MASCOTS_BY_ID: Record<string, Mascot> = Object.fromEntries(MASCOTS.map((m) => [m.id, m]));
export function mascotForRoom(roomId: string): Mascot | undefined {
  return MASCOTS.find((m) => m.room === roomId);
}
export const MASCOT_COINS = 100;
export const TOTAL_MASCOTS = MASCOTS.length;
