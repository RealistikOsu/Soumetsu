import { makeDeck } from '../src/server/casino/games/cards';
import type { Card } from '../src/server/casino/games/cards';
import { sequence } from './rng';

const RANKS: Record<string, number> = { A: 1, T: 10, J: 11, Q: 12, K: 13 };

// 'AS' is the ace of spades, 'TH' the ten of hearts.
export function cards(s: string): Card[] {
  const names = s.split(' ').filter(Boolean);
  for (const [i, name] of names.entries()) {
    if (!/^[2-9TJQKA][SHDC]$/.test(name)) throw new Error(`Unknown card ${name}`);
    if (names.indexOf(name) !== i) throw new Error(`Card ${name} twice`);
  }
  return names.map((c) => ({ rank: RANKS[c[0]] ?? Number(c[0]), suit: c[1] as Card['suit'] }));
}

const same = (a: Card, b: Card) => a.rank === b.rank && a.suit === b.suit;

// The draws that make the shuffle put `top` first, with the rest in deck order behind it.
export function stacked(top: string) {
  const first = cards(top);
  const target = [...first, ...makeDeck().filter((c) => !first.some((f) => same(c, f)))];
  const deck = makeDeck();
  const draws: number[] = [];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = deck.findIndex((c) => same(c, target[i]));
    draws.push((j + 0.5) / (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return sequence(draws);
}
