<script lang="ts">
  import { playGame, type GameInfo, type ZeusInfo, type ZeusResult } from '$lib/api/casino';
  import { describe } from '$lib/api/messages';
  import { coins } from '$lib/coins.svelte';
  import BetInput from '$lib/components/BetInput.svelte';
  import GameShell, { multiplier, wait } from '$lib/components/casino/GameShell.svelte';
  import PlayResult from '$lib/components/casino/PlayResult.svelte';
  import { flash } from '$lib/flash.svelte';
  import { ms } from '$lib/motion';
  import { m } from '$lib/paraglide/messages';

  type Play = { bet: number; payout: number; multiplier: number; result: ZeusResult };

  const glyphs: Record<string, string> = {
    ZEUS: '⚡',
    LIGHTNING: '🌩️',
    TEMPLE: '🏛️',
    THUNDER: '🌪️',
    COIN: '🪙',
    EAGLE: '🦅',
    OWL: '🦉',
    WILD: '✨'
  };
  const glyph = (symbol: string) => glyphs[symbol] ?? symbol;

  const COLS = 5;
  const ROWS = 3;
  // A run of three pays the symbol's multiplier once, four twice, five three times.
  const RUNS = [3, 4, 5];

  let bet = $state(100);
  let pending = $state(false);
  let last = $state.raw<Play | null>(null);

  const cells = (grid: string[][] | null, symbols: string[]) =>
    Array.from({ length: ROWS }, (_, row) =>
      Array.from({ length: COLS }, (_, col) => ({
        col,
        row,
        symbol: grid?.[col]?.[row] ?? symbols[(col * 3 + row) % symbols.length]
      }))
    ).flat();

  const isWild = (play: Play | null, col: number, row: number) =>
    !!play?.result.wildPositions.some(([c, r]) => c === col && r === row);
  const isWin = (play: Play | null, col: number, row: number) =>
    row === 1 && !!play?.result.wins.some((w) => col < w.count);

  async function spin(event: SubmitEvent, minBet: number) {
    event.preventDefault();
    if (!Number.isFinite(bet)) bet = minBet;
    pending = true;
    const placed = bet;
    try {
      // The grid keeps pulsing for a moment even when the server answers sooner.
      const [play] = await Promise.all([
        playGame<ZeusResult>('zeus', { bet: placed }),
        wait(ms(900))
      ]);
      last = { bet: placed, payout: play.payout, multiplier: play.multiplier, result: play.result };
      coins.set(play.balance);
    } catch (error) {
      flash.show('error', describe(error));
      coins.refresh().catch(() => {});
    }
    pending = false;
  }
</script>

<GameShell game="zeus">
  {#snippet children({
    limits,
    info,
    balance,
    blocked
  }: {
    limits: GameInfo<ZeusInfo>;
    info: ZeusInfo;
    balance: number;
    blocked: boolean;
  })}
    <section class="panel cs-game">
      <form class="cs-form cs-controls" onsubmit={(e) => spin(e, limits.minBet)}>
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
        {#if last && !pending}
          <PlayResult bet={last.bet} payout={last.payout} multiplier={last.multiplier} />
          {#if last.result.wins.length}
            <div class="cs-wins">
              <h2>{m.casino_wins()}</h2>
              <ul>
                {#each last.result.wins as win, i (i)}
                  <li>
                    <span class="cs-glyph" title={win.symbol}>{glyph(win.symbol)}</span>
                    <span class="muted">×{win.count}</span>
                    <b>{multiplier(win.multiplier)}</b>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        {/if}
      </form>

      <div class="cs-stage">
        <div class="cs-zeus" class:spinning={pending}>
          {#each cells(last?.result.grid ?? null, info.symbols) as cell (`${cell.col}-${cell.row}`)}
            <span
              class="cs-cell"
              class:idle={!last}
              class:wild={isWild(last, cell.col, cell.row)}
              class:won={!pending && isWin(last, cell.col, cell.row)}
              title={cell.symbol}
            >
              {glyph(cell.symbol)}
            </span>
          {/each}
        </div>
      </div>

      <div class="cs-paytable">
        <h2>{m.casino_paytable()}</h2>
        <table>
          <thead>
            <tr>
              <th></th>
              {#each RUNS as run (run)}
                <th>{run}</th>
              {/each}
            </tr>
          </thead>
          <tbody>
            {#each info.symbols.filter((s) => (info.multipliers[s] ?? 0) > 0) as symbol (symbol)}
              <tr>
                <td class="cs-glyph" title={symbol}>{glyph(symbol)}</td>
                {#each RUNS as run (run)}
                  <td>{multiplier(info.multipliers[symbol] * (run - 2))}</td>
                {/each}
              </tr>
            {/each}
            {#if info.symbols.includes('WILD')}
              <tr>
                <td class="cs-glyph">{glyph('WILD')}</td>
                <td colspan={RUNS.length} class="muted">{m.casino_wild()}</td>
              </tr>
            {/if}
          </tbody>
        </table>
      </div>
    </section>
  {/snippet}
</GameShell>
