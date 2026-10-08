<script lang="ts">
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import { buyItem, purchases, shop, type ShopItemView } from '$lib/api/shop';
  import { isSupporter } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import { decorationClass } from '$lib/decorations';
  import { flash } from '$lib/flash.svelte';
  import { fromIso, fullDate, number } from '$lib/format';
  import { allowed, modeNames, relaxNames } from '$lib/modes';
  import { m } from '$lib/paraglide/messages';
  import { itemDescription, itemName } from '$lib/shop';

  const DAY = 86_400_000;
  const VARIANTS = ['va', 'rx', 'ap'];

  const view = query((signal) => shop(signal));
  const history = query((signal) => purchases(signal));
  const data = $derived(view.state.status === 'ready' ? view.state.data : null);
  const spotlight = $derived(data?.items.filter((i) => i.until !== null) ?? []);
  const decorations = $derived(
    data?.items.filter((i) => i.type === 'decoration' && i.until === null) ?? []
  );
  const account = $derived(data?.items.filter((i) => i.type !== 'decoration') ?? []);
  const supporter = $derived(session.user ? isSupporter(session.user.privileges) : false);

  let busy = $state(false);
  let dialog = $state<HTMLDialogElement>();
  let pending = $state.raw<ShopItemView | null>(null);
  let newUsername = $state('');
  let wipeMode = $state('0');
  let wipeVariant = $state('va');
  let understood = $state(false);

  // 'all' only covers the combinations that exist, so it never rules anything out.
  const wipeable = (mode: string, variant: string) =>
    mode === 'all' || variant === 'all' || allowed(Number(mode), VARIANTS.indexOf(variant));

  const canBuy = (item: ShopItemView) =>
    !!data &&
    !data.loanActive &&
    !data.restricted &&
    !busy &&
    item.available &&
    !item.owned &&
    data.balance >= item.price;

  const leaves = (item: ShopItemView) =>
    Math.max(1, Math.ceil((new Date(item.until!).getTime() - Date.now()) / DAY));

  async function buy(item: ShopItemView, metadata?: Record<string, unknown>) {
    busy = true;
    try {
      await buyItem(item.id, metadata);
      flash.show('success', m.shop_bought({ name: itemName(item) }));
      dialog?.close();
      view.reload();
      history.reload();
    } catch (error) {
      flash.show('error', describe(error));
    }
    busy = false;
  }

  function start(item: ShopItemView) {
    if (item.type === 'decoration' || item.type === 'custom_badge') {
      const price = { count: item.price, price: number(item.price) };
      if (window.confirm(m.shop_confirm({ name: itemName(item), ...price }))) buy(item);
      return;
    }
    understood = false;
    pending = item;
    dialog?.showModal();
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!pending) return;
    if (pending.type === 'username_change') {
      buy(pending, { new_username: newUsername.trim() });
    } else {
      buy(pending, {
        mode: wipeMode === 'all' ? 'all' : Number(wipeMode),
        variant: wipeVariant
      });
    }
  }
</script>

{#snippet card(item: ShopItemView, pick = false)}
  <li class="panel sh-card">
    <b class="sh-preview {decorationClass(item.key)}">{session.user?.username}</b>
    <span class="sh-name">{itemName(item)}</span>
    {#if item.until}<small class="muted">{m.shop_leaves({ count: leaves(item) })}</small>{/if}
    {#if item.owned}
      <span class="sh-owned">{m.shop_owned()}</span>
    {:else}
      {#if pick && supporter}<span class="sh-owned">{m.shop_included_supporter()}</span>{/if}
      <button
        class="btn btn-blue"
        type="button"
        disabled={!canBuy(item)}
        onclick={() => start(item)}
      >
        {m.shop_buy({ price: number(item.price) })}
      </button>
    {/if}
  </li>
{/snippet}

<svelte:head><title>{m.shop_title()} · RealistikOsu</title></svelte:head>

<Banner image="leaderboard.jpg"><h1>{m.shop_title()}</h1></Banner>

<main class="wrap sh">
  {#if data}
    <section class="panel sh-top">
      <p>{m.shop_intro()}</p>
      <div>
        <b class="sh-balance">
          {m.shop_balance({ count: data.balance, coins: number(data.balance) })}
        </b>
        <a href="/commissions">{m.commissions_title()}</a>
      </div>
    </section>

    {#if data.restricted}
      <p class="sh-loan">{m.common_error_forbidden()}</p>
    {:else if data.loanActive}
      <p class="sh-loan">{m.shop_err_loan()}</p>
    {/if}

    {#if decorations.length}
      <section>
        <h2>{m.shop_section_decorations()}</h2>
        <ul class="sh-grid">
          {#each decorations as item (item.id)}{@render card(item)}{/each}
        </ul>
      </section>
    {/if}

    {#if spotlight.length}
      <section>
        <h2>{m.shop_section_spotlight()}</h2>
        <ul class="sh-grid">
          {#each spotlight as item (item.id)}{@render card(item)}{/each}
        </ul>
      </section>
    {/if}

    {#if data.supporterPicks.items.length}
      <section>
        <h2>{m.shop_section_supporter()}</h2>
        <ul class="sh-grid">
          {#each data.supporterPicks.items as item (item.id)}{@render card(item, true)}{/each}
        </ul>
      </section>
    {/if}

    {#if account.length}
      <section>
        <h2>{m.shop_section_account()}</h2>
        <ul class="sh-account">
          {#each account as item (item.id)}
            <li class="panel">
              <div>
                <b>{itemName(item)}</b>
                <small class="muted">{itemDescription(item)}</small>
              </div>
              {#if item.owned}
                <span class="sh-owned">{m.shop_owned()}</span>
              {:else}
                <button
                  class="btn btn-blue"
                  type="button"
                  disabled={!canBuy(item)}
                  onclick={() => start(item)}
                >
                  {m.shop_buy({ price: number(item.price) })}
                </button>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <section>
      <h2>{m.shop_purchases_title()}</h2>
      {#if history.state.status === 'ready'}
        {#if history.state.data.length}
          <ul class="panel sh-history">
            {#each history.state.data as purchase (purchase.id)}
              <li>
                <span class="muted">{fullDate(fromIso(purchase.bought_at))}</span>
                <span>{itemName(purchase.item)}</span>
                <span>{number(purchase.price_paid)}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="muted">{m.shop_purchases_empty()}</p>
        {/if}
      {:else if history.state.status === 'error'}
        <p class="muted">{describe(history.state.error)}</p>
      {/if}
    </section>
  {:else if view.state.status === 'error'}
    <p class="muted">{describe(view.state.error)}</p>
  {:else}
    <div class="panel"><span class="skel" style="width: 100%; height: 320px"></span></div>
  {/if}
</main>

<dialog class="dialog" bind:this={dialog} onclose={() => (pending = null)}>
  {#if pending}
    <form class="sh-form" onsubmit={submit}>
      <h2>{itemName(pending)}</h2>
      {#if pending.type === 'username_change'}
        <label>
          {m.shop_username_new()}
          <input bind:value={newUsername} required minlength="2" maxlength="15" />
        </label>
        <small class="muted">{m.shop_username_hint()}</small>
      {:else}
        <label>
          {m.shop_wipe_mode()}
          <select bind:value={wipeMode}>
            {#each modeNames as name, index (index)}
              <option value={String(index)} disabled={!wipeable(String(index), wipeVariant)}>
                {name}
              </option>
            {/each}
            <option value="all">{m.shop_wipe_all()}</option>
          </select>
        </label>
        <label>
          {m.shop_wipe_variant()}
          <select bind:value={wipeVariant}>
            {#each VARIANTS as variant, index (variant)}
              <option value={variant} disabled={!wipeable(wipeMode, variant)}>
                {relaxNames[index]}
              </option>
            {/each}
            <option value="all">{m.shop_wipe_all()}</option>
          </select>
        </label>
        <p class="sh-warning">{m.shop_wipe_warning()}</p>
        <label class="sh-check">
          <input type="checkbox" bind:checked={understood} required />
          {m.shop_wipe_confirm()}
        </label>
      {/if}
      <div class="sh-actions">
        <button class="btn" type="button" onclick={() => dialog?.close()}>
          {m.common_close()}
        </button>
        <button
          class="btn btn-blue"
          type="submit"
          disabled={busy || (pending.type === 'score_wipe' && !understood)}
        >
          {m.shop_buy({ price: number(pending.price) })}
        </button>
      </div>
    </form>
  {/if}
</dialog>
