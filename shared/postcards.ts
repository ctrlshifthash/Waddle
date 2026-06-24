// Postcards you can mail to other penguins; they land in the recipient's mailbox.
export interface PostcardType {
  id: string;
  text: string;
  emoji: string;
}

export const POSTCARDS: PostcardType[] = [
  { id: "hi", text: "Hi there!", emoji: "👋" },
  { id: "friends", text: "Let's be friends!", emoji: "🤝" },
  { id: "play", text: "Wanna play?", emoji: "🎮" },
  { id: "igloo", text: "Cool igloo!", emoji: "🏠" },
  { id: "thanks", text: "Thank you!", emoji: "💌" },
  { id: "party", text: "Party time!", emoji: "🎉" },
  { id: "bday", text: "Happy Birthday!", emoji: "🎂" },
  { id: "miss", text: "Miss you!", emoji: "🐧" },
];

export const POSTCARDS_BY_ID: Record<string, PostcardType> = Object.fromEntries(POSTCARDS.map((p) => [p.id, p]));
export const MAX_MAIL = 40;
