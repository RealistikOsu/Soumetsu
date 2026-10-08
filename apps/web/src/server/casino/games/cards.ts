export type Suit = 'S' | 'H' | 'D' | 'C';

// Rank 1 is the ace, 11 to 13 are J, Q and K.
export type Card = { suit: Suit; rank: number };

const SUITS: readonly Suit[] = ['S', 'H', 'D', 'C'];

// Suit-major like the casino's deck, so a seeded shuffle deals the same cards.
export function makeDeck() {
  const deck: Card[] = [];
  for (const suit of SUITS) for (let rank = 1; rank <= 13; rank++) deck.push({ suit, rank });
  return deck;
}
