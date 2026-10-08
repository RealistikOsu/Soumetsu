<script lang="ts">
  import { onDestroy } from 'svelte';
  import { playGame, type BingoInfo, type BingoResult, type GameInfo } from '$lib/api/casino';
  import { describe } from '$lib/api/messages';
  import { coins } from '$lib/coins.svelte';
  import BetInput from '$lib/components/BetInput.svelte';
  import { multiplier, wait } from '$lib/casino';
  import GameShell from '$lib/components/casino/GameShell.svelte';
  import PlayResult from '$lib/components/casino/PlayResult.svelte';
  import { flash } from '$lib/flash.svelte';
  import { ms, reducedMotion } from '$lib/motion';
  import { m } from '$lib/paraglide/messages';

  type Play = { bet: number; payout: number; multiplier: number; result: BingoResult };

  const LETTERS = ['B', 'I', 'N', 'G', 'O'];
  const CALL = 150;
  const blank: (number | null)[][] = LETTERS.map((_, col) =>
    [0, 1, 2, 3, 4].map((row) => (col === 2 && row === 2 ? null : 0))
  );

  // Line names count from the server's grid[col][row], so "row0" is the B column on screen.
  const lineCells = (line: string): string[] => {
    const span = [0, 1, 2, 3, 4];
    const match = /^(row|col)(\d)$/.exec(line);
    if (match?.[1] === 'row') return span.map((i) => `${match[2]}-${i}`);
    if (match?.[1] === 'col') return span.map((i) => `${i}-${match[2]}`);
    if (line === 'diag_tl') return span.map((i) => `${i}-${i}`);
    if (line === 'diag_tr') return span.map((i) => `${4 - i}-${i}`);
    return [];
  };

  // Calls stop at the first line, and one number completes at most its row, column and diagonal.
  const MAX_LINES = 3;
  const payable = (lines: Record<string, number>) =>
    Object.entries(lines)
      .filter(([count]) => Number(count) <= MAX_LINES)
      .sort(([a], [b]) => Number(a) - Number(b));

  let bet = $state(100);
  let pending = $state(false);
  let grid = $state.raw<(number | null)[][]>(blank);
  let called = $state.raw<number[]>([]);
  let last = $state.raw<Play | null>(null);
  const leaving = new AbortController();
  onDestroy(() => leaving.abort());

  const winning = $derived(last ? last.result.wonLines.flatMap(lineCells) : []);

  async function play(event: SubmitEvent, limits: GameInfo<BingoInfo>) {
    event.preventDefault();
    if (!Number.isFinite(bet)) bet = limits.minBet;
    pending = true;
    const placed = bet;
    try {
      const response = await playGame<BingoResult>('bingo', { bet: placed });
      const result = response.result;
      last = null;
      grid = result.grid;
      if (reducedMotion()) {
        called = result.called;
      } else {
        called = [];
        for (const ball of result.called) {
          await wait(ms(CALL), leaving.signal);
          if (leaving.signal.aborted) break;
          called = [...called, ball];
        }
      }
      last = { bet: placed, payout: response.payout, multiplier: response.multiplier, result };
      coins.set(response.balance);
    } catch (error) {
      flash.show('error', describe(error));
      coins.refresh().catch(() => {});
    }
    pending = false;
  }
</script>

<GameShell game="bingo">
  {#snippet children({
    limits,
    info,
    balance,
    blocked
  }: {
    limits: GameInfo<BingoInfo>;
    info: BingoInfo;
    balance: number;
    blocked: boolean;
  })}
    <section class="panel cs-game">
      <form class="cs-form cs-controls" onsubmit={(e) => play(e, limits)}>
        <BetInput
          bind:value={bet}
          min={limits.minBet}
          max={limits.maxBet}
          {balance}
          disabled={pending}
        />
        <button class="btn btn-blue cs-go" type="submit" disabled={pending || blocked}>
          {m.casino_play()}
        </button>
        {#if last}
          <p class="cs-landed">
            {last.result.wonLines.length
              ? m.casino_lines_won({ count: last.result.wonLines.length })
              : m.casino_no_line()}
          </p>
          <PlayResult bet={last.bet} payout={last.payout} multiplier={last.multiplier} />
        {/if}
      </form>

      <div class="cs-stage">
        <div class="cs-bingo">
          {#each LETTERS as letter, col (letter)}
            <div class="cs-bingo-col">
              <b>{letter}</b>
              {#each grid[col] as value, row (row)}
                <span
                  class="cs-ball-cell"
                  class:free={value === null}
                  class:marked={value === null || called.includes(value)}
                  class:won={winning.includes(`${col}-${row}`)}
                >
                  {#if value === null}
                    <i class="fa-solid fa-star"></i>
                  {:else if value}
                    {value}
                  {/if}
                </span>
              {/each}
            </div>
          {/each}
        </div>
        <div class="cs-called">
          <h2>{m.casino_calls({ count: called.length })}</h2>
          <div class="cs-called-list">
            {#each called as ball, i (i)}
              <span class:hit={grid.some((column) => column.includes(ball))}>{ball}</span>
            {/each}
          </div>
        </div>
      </div>

      <div class="cs-paytable">
        <h2>{m.casino_paytable()}</h2>
        <table>
          <tbody>
            {#each payable(info.lines) as [lines, value] (lines)}
              <tr>
                <td>{m.casino_lines_won({ count: Number(lines) })}</td>
                <td>{multiplier(value)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {/snippet}
</GameShell>
