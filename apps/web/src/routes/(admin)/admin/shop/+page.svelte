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

<h2 class="section-title c-pink"><i class="fa-solid fa-store"></i>Items</h2>
{#if items.state.status === 'error'}
  <p class="empty-note">{describe(items.state.error)}</p>
{:else}
  <div class="table-wrap">
    <table class="board admin-table c-pink">
      <thead>
        <tr><th>Item</th><th>Key</th><th>Price</th><th>Enabled</th><th>Sort</th><th></th></tr>
      </thead>
      <tbody>
        {#each rows as row (row.id)}
          <tr>
            <td>{row.name}</td>
            <td class="note">{row.item_key ?? row.type}</td>
            <td>
              <input
                type="number"
                min="0"
                step="1"
                aria-label="Price for {row.name}"
                bind:value={row.price}
              />
            </td>
            <td>
              <input type="checkbox" aria-label="Enabled: {row.name}" bind:checked={row.enabled} />
            </td>
            <td>
              <input
                type="number"
                step="1"
                aria-label="Sort order for {row.name}"
                bind:value={row.sort_order}
              />
            </td>
            <td>
              <button class="btn" type="button" disabled={busy} onclick={() => saveItem(row)}>
                Save
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}

{#if settings.state.status === 'ready'}
  {@const current = settings.state.data}

  <h2 class="section-title c-pink"><i class="fa-solid fa-coins"></i>Supporter price</h2>
  <div class="panel form-panel admin-form settings-form c-pink">
    <div class="field">
      <label for="shop-price">Price of a supporter decoration</label>
      <input id="shop-price" type="number" min="1" step="1" bind:value={price} />
    </div>
    <button
      class="btn btn-blue"
      type="button"
      disabled={busy}
      onclick={() => saveSettings(current, { supporterPrice: Number(price) }, 'Price saved.')}
    >
      <i class="fa-solid fa-floppy-disk"></i>Save
    </button>
  </div>

  <h2 class="section-title c-pink"><i class="fa-solid fa-lightbulb"></i>Spotlight windows</h2>
  <div class="panel form-panel admin-form settings-form c-pink">
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
          class="btn"
          type="button"
          aria-label="Remove window {index + 1}"
          onclick={() => (windows = windows.filter((_, i) => i !== index))}
        >
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    {:else}
      <p class="note">No windows.</p>
    {/each}
    <div class="form-actions">
      <button class="btn" type="button" onclick={addWindow}>
        <i class="fa-solid fa-plus"></i>Add window
      </button>
      <button
        class="btn btn-blue"
        type="button"
        disabled={busy}
        onclick={() => saveSpotlight(current)}
      >
        <i class="fa-solid fa-floppy-disk"></i>Save
      </button>
    </div>
  </div>

  <h2 class="section-title c-pink">
    <i class="fa-solid fa-heart"></i>Supporter picks, {current.picks.month}
  </h2>
  <div class="panel form-panel admin-form settings-form c-pink">
    <p class="note">
      This month: {current.picks.keys.map(nameOf).join(', ')}
      {current.supporterPins[current.picks.month] ? '(pinned)' : '(random)'}
    </p>
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
    <div class="form-actions">
      <button
        class="btn"
        type="button"
        disabled={busy || !current.supporterPins[current.picks.month]}
        onclick={() => clearOverride(current)}
      >
        Clear override
      </button>
      <button
        class="btn btn-blue"
        type="button"
        disabled={busy}
        onclick={() => saveOverride(current)}
      >
        <i class="fa-solid fa-floppy-disk"></i>Save override
      </button>
    </div>
  </div>
{:else if settings.state.status === 'error'}
  <p class="empty-note">{describe(settings.state.error)}</p>
{/if}

<h2 class="section-title c-pink"><i class="fa-solid fa-receipt"></i>Recent purchases</h2>
{#if purchases.state.status === 'ready'}
  {@const data = purchases.state.data}
  <div class="table-wrap">
    <table class="board admin-table c-pink">
      <thead>
        <tr><th>Player</th><th>Item</th><th>Paid</th><th>When</th></tr>
      </thead>
      <tbody>
        {#each data.purchases as purchase (purchase.id)}
          <tr>
            <td><a href="/admin/users/{purchase.user_id}">{purchase.username}</a></td>
            <td>{purchase.item.name}</td>
            <td>{purchase.price_paid}</td>
            <td>{fullDate(Date.parse(purchase.bought_at) / 1000)}</td>
          </tr>
        {:else}
          <tr><td colspan="4" class="note">Nothing bought yet.</td></tr>
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
  <p class="empty-note">{describe(purchases.state.error)}</p>
{/if}
