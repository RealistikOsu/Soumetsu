import { m } from '$lib/paraglide/messages';
import type { Game } from '$lib/api/casino';
import { decimal } from '$lib/format';

export const games: { key: Game; route: string }[] = (
  [
    'coinflip',
    'plinko',
    'slots',
    'roulette',
    'wheel',
    'bingo',
    'chicken_road',
    'aviator',
    'mines',
    'poker',
    'zeus',
    'blackjack'
  ] as const
).map((key) => ({
  key,
  route: `/casino/${key.replaceAll('_', '-')}`
}));

const titles: Record<Game, () => string> = {
  coinflip: m.casino_game_coinflip,
  plinko: m.casino_game_plinko,
  slots: m.casino_game_slots,
  roulette: m.casino_game_roulette,
  wheel: m.casino_game_wheel,
  bingo: m.casino_game_bingo,
  chicken_road: m.casino_game_chicken_road,
  aviator: m.casino_game_aviator,
  mines: m.casino_game_mines,
  poker: m.casino_game_poker,
  zeus: m.casino_game_zeus,
  blackjack: m.casino_game_blackjack
};

const blurbs: Record<Game, () => string> = {
  coinflip: m.casino_game_coinflip_blurb,
  plinko: m.casino_game_plinko_blurb,
  slots: m.casino_game_slots_blurb,
  roulette: m.casino_game_roulette_blurb,
  wheel: m.casino_game_wheel_blurb,
  bingo: m.casino_game_bingo_blurb,
  chicken_road: m.casino_game_chicken_road_blurb,
  aviator: m.casino_game_aviator_blurb,
  mines: m.casino_game_mines_blurb,
  poker: m.casino_game_poker_blurb,
  zeus: m.casino_game_zeus_blurb,
  blackjack: m.casino_game_blackjack_blurb
};

export const gameTitle = (key: Game) => titles[key]?.() ?? key;
export const gameBlurb = (key: Game) => blurbs[key]?.() ?? key;

export const multiplier = (value: number) => `×${decimal(value)}`;

// What a cash out pays at m, before any supporter bonus. m is rounded to hundredths
// first so 1.1 × 100 gives 110, not 109.
export const payoutPreview = (bet: number, m: number) =>
  Math.floor((bet * Math.round(m * 100)) / 100);

// Resolves early on abort, so a page that's left still applies the play it already has.
export const wait = (time: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(resolve, time);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });
