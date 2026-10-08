<script lang="ts">
  import { casinoConfig, saveCasinoConfig, type CasinoConfigRow } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import { flash } from '$lib/flash.svelte';

  type Draft = Omit<CasinoConfigRow, 'odds'> & { odds: string };

  const label = (game: string) => game[0].toUpperCase() + game.slice(1).replaceAll('_', ' ');

  let version = $state(0);
  let busy = $state(false);
  let rows = $state<Draft[]>([]);

  const config = query((signal) => {
    void version;
    return casinoConfig(signal);
  });

  $effect(() => {
    if (config.state.status !== 'ready') return;
    rows = config.state.data.map((row) => ({
      ...row,
      odds: row.odds ? JSON.stringify(row.odds, null, 2) : ''
    }));
  });

  async function save(row: Draft) {
    let odds: CasinoConfigRow['odds'] = null;
    if (row.odds.trim()) {
      try {
        odds = JSON.parse(row.odds);
      } catch {
        flash.show('error', `Odds for ${label(row.game)} aren't valid JSON.`);
        return;
      }
    }
    busy = true;
    try {
      await saveCasinoConfig({
        game: row.game,
        minBet: Number(row.minBet),
        maxBet: Number(row.maxBet),
        enabled: row.enabled,
        odds
      });
      flash.show('success', `Saved ${label(row.game)}.`);
      version++;
    } catch (error) {
      flash.show('error', describe(error));
    }
    busy = false;
  }
</script>

<AdminHead heading="Casino" text="Bet limits, the on/off switch and the odds for every game." />

<h2 class="section-title c-yellow"><i class="fa-solid fa-dice"></i>Games</h2>
{#if config.state.status === 'error'}
  <p class="empty-note">{describe(config.state.error)}</p>
{:else}
  <div class="table-wrap">
    <table class="board admin-table casino-config c-yellow">
      <thead>
        <tr><th>Game</th><th>Min bet</th><th>Max bet</th><th>Enabled</th><th>Odds</th><th></th></tr>
      </thead>
      <tbody>
        {#each rows as row (row.game)}
          <tr>
            <td>{label(row.game)}</td>
            <td>
              <input
                type="number"
                min="1"
                step="1"
                aria-label="Min bet for {row.game}"
                bind:value={row.minBet}
              />
            </td>
            <td>
              <input
                type="number"
                min="1"
                step="1"
                aria-label="Max bet for {row.game}"
                bind:value={row.maxBet}
              />
            </td>
            <td>
              <input type="checkbox" aria-label="Enabled: {row.game}" bind:checked={row.enabled} />
            </td>
            <td>
              <textarea
                rows="3"
                spellcheck="false"
                aria-label="Odds for {row.game}"
                bind:value={row.odds}></textarea>
            </td>
            <td>
              <button class="btn" type="button" disabled={busy} onclick={() => save(row)}>
                Save
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}
