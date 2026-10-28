<script lang="ts">
  import {
    setShopItem,
    setShopSettings,
    shopItems,
    shopPurchases,
    shopSettings,
    type ShopItemRow,
    type ShopSettings
  } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Pager from '$lib/components/Pager.svelte';
  import { shopDecorations, supporterDecorations } from '$lib/decorations';
  import { flash } from '$lib/flash.svelte';
  import { fullDate } from '$lib/format';

  let version = $state(0);
  let busy = $state(false);
  let purchasePage = $state(1);

  const items = query((signal) => {
    void version;
    return shopItems(signal);
  });
  const settings = query((signal) => {
    void version;
    return shopSettings(signal);
  });
  const purchases = query((signal) => {
    void version;
    return shopPurchases(purchasePage, signal);
  });

  let rows = $state<ShopItemRow[]>([]);
  let price = $state(0);
  let windows = $state<{ key: string; from: string; until: string }[]>([]);
  let picks = $state<string[]>(['', '', '']);

  // datetime-local inputs speak local time without a zone, the settings store ISO strings.
  const toLocal = (iso: string) => {
    const date = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const toIso = (local: string) => new Date(local).toISOString();

  $effect(() => {
    if (items.state.status === 'ready') rows = structuredClone($state.snapshot(items.state.data));
  });
  $effect(() => {
    if (settings.state.status !== 'ready') return;
    const data = settings.state.data;
    price = data.supporterPrice;
    windows = data.spotlight.map((w) => ({
      key: w.key,
      from: toLocal(w.from),
      until: toLocal(w.until)
    }));
    picks = [...data.picks.keys];
  });

  const nameOf = (key: string) => supporterDecorations.find((d) => d.key === key)?.name ?? key;

  async function run(action: () => Promise<unknown>, success: string) {
    busy = true;
    try {
      await action();
      flash.show('success', success);
      version++;
    } catch (error) {
      flash.show('error', describe(error));
    }
    busy = false;
  }

  const saveItem = (row: ShopItemRow) =>
    run(
      () =>
        setShopItem({
          id: row.id,
          price: Number(row.price),
          enabled: row.enabled,
          sort_order: Number(row.sort_order)
        }),
      `Saved ${row.name}.`
    );

  function base(current: ShopSettings): Omit<ShopSettings, 'picks'> {
    return {
      supporterPrice: current.supporterPrice,
      spotlight: current.spotlight,
      supporterPins: current.supporterPins
    };
  }

  const saveSettings = (
    current: ShopSettings,
    change: Partial<Omit<ShopSettings, 'picks'>>,
    success: string
  ) => run(() => setShopSettings({ ...base(current), ...change }), success);

  function saveSpotlight(current: ShopSettings) {
    for (const w of windows) {
      if (!w.from || !w.until || Date.parse(w.until) <= Date.parse(w.from)) {
        flash.show('error', 'Fill in both dates.');
        return;
      }
    }
    const spotlight = windows.map((w) => ({
      key: w.key,
      from: toIso(w.from),
      until: toIso(w.until)
    }));
    return saveSettings(current, { spotlight }, 'Spotlight windows saved.');
  }

  function saveOverride(current: ShopSettings) {
    if (new Set(picks).size !== 3 || picks.some((key) => !key)) {
      flash.show('error', 'Pick three different decorations.');
      return;
    }
    return saveSettings(
      current,
      { supporterPins: { ...current.supporterPins, [current.picks.month]: [...picks] } },
      'Override saved.'
    );
  }

  function clearOverride(current: ShopSettings) {
    const pins = { ...current.supporterPins };
    delete pins[current.picks.month];
    return saveSettings(current, { supporterPins: pins }, 'Override cleared.');
  }

  const addWindow = () =>
    (windows = [...windows, { key: shopDecorations[0].key, from: '', until: '' }]);
</script>

<AdminHead
  heading="Shop"
  text="Prices, the spotlight rotation, the monthly supporter picks and recent purchases."
/>

<section class="user-box">
  <h2>Items</h2>
  {#if items.state.status === 'error'}
    <p class="muted">{describe(items.state.error)}</p>
  {:else}
    <div class="table-wrap in-box">
      <table class="board admin-table">
        <thead>
          <tr><th>Item</th><th>Key</th><th>Price</th><th>Enabled</th><th>Sort</th><th></th></tr>
        </thead>
        <tbody>
          {#each rows as row (row.id)}
            <tr>
              <td><b>{row.name}</b></td>
              <td><code class="value-code">{row.item_key ?? row.type}</code></td>
              <td>
                <span class="coin-in">
                  <input
                    class="num-in"
                    type="number"
                    min="1"
                    step="1"
                    aria-label="Price for {row.name}"
                    bind:value={row.price}
                  /><i class="fa-solid fa-coins"></i>
                </span>
              </td>
              <td>
                <label class="switch">
                  <input
                    type="checkbox"
                    aria-label="Enabled: {row.name}"
                    bind:checked={row.enabled}
                  /><span></span>
                </label>
              </td>
              <td>
                <input
                  class="num-in small"
                  type="number"
                  step="1"
                  aria-label="Sort order for {row.name}"
                  bind:value={row.sort_order}
                />
              </td>
              <td class="actions">
                <button class="act" type="button" disabled={busy} onclick={() => saveItem(row)}>
                  Save
                </button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

{#if settings.state.status === 'ready'}
  {@const current = settings.state.data}
  <div class="user-split">
    <div class="user-main">
      <section class="user-box">
        <h2>Spotlight windows</h2>
        {#each windows as window, index (index)}
          <div class="field-row">
            <div class="field">
              <label for="sp-key-{index}">Decoration</label>
              <select id="sp-key-{index}" bind:value={window.key}>
                {#each shopDecorations as deco (deco.key)}
                  <option value={deco.key}>{deco.name}</option>
                {/each}
              </select>
            </div>
            <div class="field">
              <label for="sp-from-{index}">From</label>
              <input id="sp-from-{index}" type="datetime-local" bind:value={window.from} />
            </div>
            <div class="field">
              <label for="sp-until-{index}">Until</label>
              <input id="sp-until-{index}" type="datetime-local" bind:value={window.until} />
            </div>
            <button
              class="act"
              type="button"
              aria-label="Remove window {index + 1}"
              onclick={() => (windows = windows.filter((_, i) => i !== index))}
            >
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        {:else}
          <p class="muted">No windows.</p>
        {/each}
        <div class="form-foot">
          <button class="act" type="button" onclick={addWindow}>
            <i class="fa-solid fa-plus"></i>Add window
          </button>
          <button
            class="btn btn-green"
            type="button"
            disabled={busy}
            onclick={() => saveSpotlight(current)}
          >
            <i class="fa-solid fa-floppy-disk"></i>Save
          </button>
        </div>
      </section>

      <section class="user-box">
        <h2>
          Supporter picks, {current.picks.month}
          <small>{current.supporterPins[current.picks.month] ? 'Pinned' : 'Random'}</small>
        </h2>
        <p class="muted">This month: {current.picks.keys.map(nameOf).join(', ')}</p>
        <div class="field-row">
          {#each [0, 1, 2] as index (index)}
            <div class="field">
              <label for="pick-{index}">Pick {index + 1}</label>
              <select id="pick-{index}" bind:value={picks[index]}>
                {#each supporterDecorations as deco (deco.key)}
                  <option value={deco.key}>{deco.name}</option>
                {/each}
              </select>
            </div>
          {/each}
        </div>
        <div class="form-foot">
          <button
            class="act"
            type="button"
            disabled={busy || !current.supporterPins[current.picks.month]}
            onclick={() => clearOverride(current)}
          >
            Clear override
          </button>
          <button
            class="btn btn-green"
            type="button"
            disabled={busy}
            onclick={() => saveOverride(current)}
          >
            <i class="fa-solid fa-floppy-disk"></i>Save override
          </button>
        </div>
      </section>
    </div>

    <aside>
      <section class="user-box">
        <h2>Supporter price</h2>
        <div class="set-row">
          <div>
            <b>Supporter decoration</b>
            <p>What each monthly pick costs supporters.</p>
          </div>
          <span class="coin-in">
            <input
              class="num-in"
              type="number"
              min="1"
              step="1"
              aria-label="Price of a supporter decoration"
              bind:value={price}
            /><i class="fa-solid fa-coins"></i>
          </span>
        </div>
        <div class="form-foot">
          <button
            class="btn btn-green"
            type="button"
            disabled={busy}
            onclick={() => saveSettings(current, { supporterPrice: Number(price) }, 'Price saved.')}
          >
            <i class="fa-solid fa-floppy-disk"></i>Save
          </button>
        </div>
      </section>
    </aside>
  </div>
{:else if settings.state.status === 'error'}
  <p class="panel empty-note">{describe(settings.state.error)}</p>
{/if}

<section class="user-box purchases-box">
  <h2>Recent purchases</h2>
  {#if purchases.state.status === 'ready'}
    {@const data = purchases.state.data}
    <div class="table-wrap in-box">
      <table class="board admin-table">
        <thead>
          <tr><th>Player</th><th>Item</th><th>Paid</th><th>When</th></tr>
        </thead>
        <tbody>
          {#each data.purchases as purchase (purchase.id)}
            <tr>
              <td>
                <a class="who" href="/admin/users/{purchase.user_id}"
                  ><Avatar id={purchase.user_id} /><b>{purchase.username}</b></a
                >
              </td>
              <td>{purchase.item.name}</td>
              <td class="dim">
                <span class="coin-in"><i class="fa-solid fa-coins"></i>{purchase.price_paid}</span>
              </td>
              <td class="dim">{fullDate(Date.parse(purchase.bought_at) / 1000)}</td>
            </tr>
          {:else}
            <tr><td colspan="4" class="faint">Nothing bought yet.</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if data.total > 50}
      <Pager
        page={purchasePage}
        pages={Math.ceil(data.total / 50)}
        hasNext={purchasePage * 50 < data.total}
        onpage={(p) => (purchasePage = p)}
      />
    {/if}
  {:else if purchases.state.status === 'error'}
    <p class="muted">{describe(purchases.state.error)}</p>
  {/if}
</section>
