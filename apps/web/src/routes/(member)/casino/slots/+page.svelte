<script lang="ts">
  import { onDestroy } from 'svelte';
  import { playGame, type GameInfo, type SlotsInfo, type SlotsResult } from '$lib/api/casino';
  import { describe } from '$lib/api/messages';
  import { coins } from '$lib/coins.svelte';
  import BetInput from '$lib/components/BetInput.svelte';
  import { multiplier, wait } from '$lib/casino';
  import GameShell from '$lib/components/casino/GameShell.svelte';
  import PlayResult from '$lib/components/casino/PlayResult.svelte';
  import { flash } from '$lib/flash.svelte';
  import { ms } from '$lib/motion';
  import { m } from '$lib/paraglide/messages';

  type Play = { bet: number; payout: number; multiplier: number; result: SlotsResult };

  const glyphs: Record<string, string> = {
    Cherry: '🍒',
    Lemon: '🍋',
    Orange: '🍊',
    Grape: '🍇',
    Diamond: '💎'
  };
  const glyph = (symbol: string) => glyphs[symbol] ?? symbol;

  const STOPS = [800, 1300, 1800];

  const lines: Record<string, [number, number][]> = {
    top: [
      [0, 0],
      [1, 0],
      [2, 0]
    ],
    middle: [
      [0, 1],
      [1, 1],
      [2, 1]
    ],
    bottom: [
      [0, 2],
      [1, 2],
      [2, 2]
    ],
    diagonal_down: [
      [0, 0],
      [1, 1],
      [2, 2]
    ],
    diagonal_up: [
      [0, 2],
      [1, 1],
      [2, 0]
    ]
  };

  const cellsOf = (line: string): [number, number][] => {
    const column = /^column_(\d)$/.exec(line);
    if (column) return [0, 1, 2].map((row) => [Number(column[1]), row]);
    return lines[line] ?? [];
  };

  const leaving = new AbortController();
  onDestroy(() => leaving.abort());

  let bet = $state(100);
  let pending = $state(false);
  let spinning = $state.raw([false, false, false]);
  let grid = $state.raw<string[][] | null>(null);
  let last = $state.raw<Play | null>(null);

  const winning = $derived(
    last ? last.result.paylines.flatMap((p) => cellsOf(p.line).map(([c, r]) => `${c}-${r}`)) : []
  );

  // Each reel cycles through the symbols from a different start, so the three strips don't line up.
  const strip = (symbols: string[], reel: number) => {
    const cycle = symbols.map((_, i) => symbols[(i + reel * 2) % symbols.length]);
    return [...cycle, ...cycle];
  };

  async function spin(event: SubmitEvent, limits: GameInfo<SlotsInfo>) {
    event.preventDefault();
    if (!Number.isFinite(bet)) bet = limits.minBet;
    pending = true;
    last = null;
    spinning = [true, true, true];
    const placed = bet;
    const started = performance.now();
    try {
      const play = await playGame<SlotsResult>('slots', { bet: placed });
      grid = play.result.grid;
      await Promise.all(
        STOPS.map(async (stop, reel) => {
          await wait(Math.max(0, ms(stop) - (performance.now() - started)), leaving.signal);
          spinning = spinning.map((s, i) => (i === reel ? false : s));
        })
      );
      last = { bet: placed, payout: play.payout, multiplier: play.multiplier, result: play.result };
      coins.set(play.balance);
    } catch (error) {
      spinning = [false, false, false];
      flash.show('error', describe(error));
      coins.refresh().catch(() => {});
    }
    pending = false;
  }
</script>

<GameShell game="slots">
  {#snippet children({
    limits,
    info,
    balance,
    blocked
  }: {
    limits: GameInfo<SlotsInfo>;
    info: SlotsInfo;
    balance: number;
    blocked: boolean;
  })}
    <section class="panel cs-game">
      <form class="cs-form cs-controls" onsubmit={(e) => spin(e, limits)}>
        <BetInput
          bind:value={bet}
          min={limits.minBet}
          max={limits.maxBet}
          {balance}
          disabled={pending}
        />
        <button class="btn btn-blue cs-go" type="submit" disabled={pending || blocked}>
          {pending ? m.casino_spinning() : m.casino_spin()}
        </button>
        {#if last}
          <PlayResult bet={last.bet} payout={last.payout} multiplier={last.multiplier} />
        {/if}
      </form>

      <div class="cs-stage">
        <div class="cs-reels">
          {#each [0, 1, 2] as reel (reel)}
            <div class="cs-reel">
              {#if spinning[reel]}
                <div class="cs-strip" style="--cells: {info.symbols.length}">
                  {#each strip(info.symbols, reel) as symbol, i (i)}
                    <span class="cs-cell">{glyph(symbol)}</span>
                  {/each}
                </div>
              {:else}
                {#each [0, 1, 2] as row (row)}
                  {#if grid}
                    <span
                      class="cs-cell landed"
                      class:won={winning.includes(`${reel}-${row}`)}
                      title={grid[reel][row]}
                    >
                      {glyph(grid[reel][row])}
                    </span>
                  {:else}
                    <span class="cs-cell idle">
                      {glyph(info.symbols[(row + reel * 2) % info.symbols.length])}
                    </span>
                  {/if}
                {/each}
              {/if}
            </div>
          {/each}
        </div>
      </div>

      <div class="cs-paytable">
        <h2>{m.casino_paytable()}</h2>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>{m.casino_line()}</th>
              <th>{m.casino_column()}</th>
            </tr>
          </thead>
          <tbody>
            {#each info.symbols as symbol (symbol)}
              {@const value = info.multipliers[symbol] ?? 0}
              <tr>
                <td class="cs-glyph" title={symbol}>{glyph(symbol)}</td>
                <td>{multiplier(value)}</td>
                <td>{info.columns[symbol] == null ? '–' : multiplier(info.columns[symbol])}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/snippet}
</GameShell>
