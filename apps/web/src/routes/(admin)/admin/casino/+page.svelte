<script lang="ts">
  import { casinoConfig, saveCasinoConfig, type CasinoConfigRow } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import OddsField from '$lib/components/admin/OddsField.svelte';
  import { flash } from '$lib/flash.svelte';

  // The form edits odds; the JSON text is the fallback for odds a game doesn't have yet.
  type Draft = Omit<CasinoConfigRow, 'odds'> & {
    odds: Record<string, unknown> | null;
    json: string;
    raw: boolean;
  };

  const label = (game: string) => game[0].toUpperCase() + game.slice(1).replaceAll('_', ' ');

  const icons: Record<string, string> = {
    coinflip: 'fa-coins',
    plinko: 'fa-circle-nodes',
    slots: 'fa-lemon',
    zeus: 'fa-bolt',
    wheel: 'fa-dharmachakra',
    roulette: 'fa-circle-dot',
    bingo: 'fa-table-cells',
    poker: 'fa-crown',
    mines: 'fa-bomb',
    chicken_road: 'fa-feather',
    aviator: 'fa-plane',
    blackjack: 'fa-diamond'
  };

  let busy = $state(false);
  let rows = $state<Draft[]>([]);

  const config = query((signal) => casinoConfig(signal));

  const draft = (row: CasinoConfigRow): Draft => ({
    ...row,
    odds: row.odds ? structuredClone(row.odds) : null,
    json: row.odds ? JSON.stringify(row.odds, null, 2) : '',
    raw: !row.odds
  });

  $effect(() => {
    if (config.state.status === 'ready') rows = config.state.data.map(draft);
  });

  function showJson(row: Draft) {
    row.json = row.odds ? JSON.stringify($state.snapshot(row.odds), null, 2) : row.json;
    row.raw = true;
  }

  function showForm(row: Draft) {
    try {
      row.odds = JSON.parse(row.json);
      row.raw = false;
    } catch {
      flash.show('error', `Odds for ${label(row.game)} aren't valid JSON.`);
    }
  }

  async function save(row: Draft) {
    let odds: CasinoConfigRow['odds'];
    try {
      odds = row.raw ? JSON.parse(row.json) : $state.snapshot(row.odds);
    } catch {
      flash.show('error', `Odds for ${label(row.game)} aren't valid JSON.`);
      return;
    }
    if (!odds) {
      flash.show('error', `Fill in the odds for ${label(row.game)}.`);
      return;
    }
    busy = true;
    try {
      const saved = await saveCasinoConfig({
        game: row.game,
        minBet: Number(row.minBet),
        maxBet: Number(row.maxBet),
        enabled: row.enabled,
        odds
      });
      // Only the saved row is replaced, so unsaved edits in the others survive.
      const fresh = saved.find((r) => r.game === row.game);
      if (fresh) rows = rows.map((r) => (r.game === row.game ? draft(fresh) : r));
      flash.show('success', `Saved ${label(row.game)}.`);
    } catch (error) {
      flash.show('error', describe(error));
    }
    busy = false;
  }
</script>

<AdminHead heading="Casino" text="Bet limits, the on/off switch and the odds for every game." />

{#if config.state.status === 'error'}
  <p class="panel empty-note">{describe(config.state.error)}</p>
{:else if config.state.status === 'loading'}
  <span class="skel" style="width: 100%; height: 300px"></span>
{:else}
  <div class="game-cards">
    {#each rows as row (row.game)}
      <details class="game-card">
        <summary>
          <span class="game-icon"><i class="fa-solid {icons[row.game] ?? 'fa-dice'}"></i></span>
          <b>{label(row.game)}</b>
          <span class="admin-tag {row.enabled ? 'c-green' : 'c-grey'}">
            {row.enabled ? 'On' : 'Off'}
          </span>
          <span class="dim">{row.minBet}–{row.maxBet} coins</span>
          <span class="go">Odds<i class="fa-solid fa-chevron-down"></i></span>
        </summary>
        <div class="game-body">
          <div class="odd-fields">
            <label class="odd">
              <span>Min bet</span>
              <span class="coin-in"
                ><input class="num-in" type="number" min="1" step="1" bind:value={row.minBet} /><i
                  class="fa-solid fa-coins"
                ></i></span
              >
            </label>
            <label class="odd">
              <span>Max bet</span>
              <span class="coin-in"
                ><input class="num-in" type="number" min="1" step="1" bind:value={row.maxBet} /><i
                  class="fa-solid fa-coins"
                ></i></span
              >
            </label>
            <label class="odd">
              <span>Enabled</span>
              <span class="switch"
                ><input type="checkbox" bind:checked={row.enabled} /><span></span></span
              >
            </label>
          </div>
          <div class="odds-head">
            <b>Odds</b>
            <nav class="seg">
              <button
                class:active={!row.raw}
                type="button"
                disabled={!row.odds && !row.json}
                onclick={() => row.raw && showForm(row)}>Form</button
              >
              <button class:active={row.raw} type="button" onclick={() => !row.raw && showJson(row)}
                >JSON</button
              >
            </nav>
          </div>
          {#if row.raw}
            <textarea
              class="odds-json"
              rows="10"
              spellcheck="false"
              aria-label="Odds for {row.game}"
              placeholder={row.game === 'coinflip' ? '{"multiplier": 2}' : undefined}
              bind:value={row.json}></textarea>
          {:else if row.odds}
            <OddsField owner={row} key="odds" />
          {/if}
          <div class="form-foot">
            <button class="btn btn-green" type="button" disabled={busy} onclick={() => save(row)}>
              <i class="fa-solid fa-floppy-disk"></i>Save {label(row.game)}
            </button>
          </div>
        </div>
      </details>
    {/each}
  </div>
{/if}
