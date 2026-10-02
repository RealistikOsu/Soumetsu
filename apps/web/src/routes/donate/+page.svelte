<script lang="ts">
  import { site } from '$lib/site.svelte';
  import { page } from '$app/state';
  import { api } from '$lib/api/client';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import { siteApi } from '$lib/api/site';
  import { isSupporter } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { flash } from '$lib/flash.svelte';
  import { intlLocale } from '$lib/i18n';
  import { m } from '$lib/paraglide/messages';

  const reasons = [
    [
      'c-blue',
      'fa-server',
      m.support_donate_reason_cost_title(),
      m.support_donate_reason_cost_text()
    ],
    [
      'c-purple',
      'fa-graduation-cap',
      m.support_donate_reason_students_title(),
      m.support_donate_reason_students_text()
    ],
    [
      'c-green',
      'fa-shield-heart',
      m.support_donate_reason_honest_title(),
      m.support_donate_reason_honest_text()
    ]
  ];

  const perks = [
    ['c-red', 'fa-pen', m.support_donate_perk_names_title(), m.support_donate_perk_names_text()],
    [
      'c-yellow',
      'fa-wand-magic-sparkles',
      m.support_donate_perk_profile_title(),
      m.support_donate_perk_profile_text()
    ],
    [
      'c-purple',
      'fa-palette',
      m.support_donate_perk_decorations_title(),
      `${m.support_donate_perk_decorations_text()} <span class="deco-samples"><b class="deco-sunset">Sunset</b> <b class="deco-fire">Fire</b> <b class="deco-ember">Ember</b> <b class="deco-sakura">Sakura</b></span> <a href="/settings/decoration">${m.support_donate_perk_decorations_link()}</a>`
    ],
    [
      'c-teal',
      'fa-film',
      m.support_donate_perk_avatar_title(),
      m.support_donate_perk_avatar_text()
    ],
    [
      'c-discord',
      'fa-discord',
      m.support_donate_perk_discord_title(),
      m.support_donate_perk_discord_text()
    ],
    ['c-orange', 'fa-eraser', m.support_donate_perk_wipe_title(), m.support_donate_perk_wipe_text()]
  ];

  const status = query((signal) =>
    session.user
      ? siteApi.get<{ expires: number | null }>('/me/supporter', undefined, signal)
      : Promise.resolve(null)
  );

  let months = $state(1);
  let gifting = $state(false);
  let search = $state('');
  let target = $state<{ id: number; username: string } | null>(null);
  let found = $state.raw<{ id: number; username: string }[]>([]);
  let busy = $state(false);

  // Pounds for a number of months, the same curve the server charges by.
  const price = $derived(Math.pow(months * 3, 0.84).toFixed(2));
  const payee = $derived(
    target ?? (session.user ? { id: session.user.id, username: session.user.username } : null)
  );
  const expires = $derived(
    status.state.status === 'ready' ? (status.state.data?.expires ?? null) : null
  );

  $effect(() => {
    const text = search.trim();
    if (!gifting || !text) {
      found = [];
      return;
    }
    const timer = setTimeout(() => {
      api.get<{ id: number; username: string }[]>('/users/search', { q: text, limit: 6 }).then(
        (rows) => (found = rows),
        () => (found = [])
      );
    }, 250);
    return () => clearTimeout(timer);
  });

  $effect(() => {
    const result = page.url.searchParams.get('payment');
    if (result === 'success') flash.show('success', m.support_donate_paid());
    if (result === 'cancel') flash.show('warning', m.support_donate_cancelled());
  });

  async function pay(provider: 'stripe' | 'freekassa') {
    if (!payee) return;
    busy = true;
    try {
      location.href = await siteApi.post<string>(`/donate/${provider}`, {
        user_id: payee.id,
        months
      });
    } catch (error) {
      flash.show('error', describe(error));
      busy = false;
    }
  }

  const methods = $derived(site.info?.payments);
</script>

<svelte:head><title>{m.support_donate_title()} · RealistikOsu</title></svelte:head>

<Banner image="support.png" class="support-banner">
  <div>
    <h1>{m.support_donate_heading()}</h1>
    <p class="sub">{m.support_donate_sub()}</p>
  </div>
</Banner>

<main class="wrap support">
  {#if session.user && isSupporter(session.user.privileges)}
    <div class="panel supporter-box c-yellow">
      <i class="fa-solid fa-heart beating"></i>
      <div>
        <h2>{m.support_donate_already()}</h2>
        {#if expires}
          {@const date = new Date(expires * 1000).toLocaleDateString(intlLocale(), {
            dateStyle: 'long'
          })}
          <p>
            {m.support_donate_expires()}
            <time datetime={new Date(expires * 1000).toISOString()} title={date}>
              {m.support_donate_expires_on({ date })}
            </time>{m.support_donate_expires_thanks()}
          </p>
        {/if}
        <p class="faint">{m.support_donate_add_more()}</p>
      </div>
    </div>
  {/if}

  <SectionTitle colour="c-blue" icon="fa-circle-question"
    >{m.support_donate_reasons_title()}</SectionTitle
  >
  <div class="perks three">
    {#each reasons as [colour, icon, name, text] (name)}
      <div class="perk {colour}">
        <i class="fa-solid {icon}"></i><b>{name}</b>
        <p>{text}</p>
      </div>
    {/each}
  </div>

  <SectionTitle colour="c-yellow" icon="fa-gift">{m.support_donate_perks_title()}</SectionTitle>
  <div class="perks">
    {#each perks as [colour, icon, name, text] (name)}
      <div class="perk {colour}">
        <i class="{icon === 'fa-discord' ? 'fa-brands' : 'fa-solid'} {icon}"></i>
        <b>{name}</b>
        <p>{@html text}</p>
      </div>
    {/each}
  </div>

  <SectionTitle colour="c-pink" icon="fa-heart">{m.support_donate_get_title()}</SectionTitle>
  {#if !session.user}
    <div class="panel c-pink">
      <p class="empty-note">
        <a href="/login?redir=/donate">{m.support_donate_login()}</a>
        {m.support_donate_login_after()}
      </p>
    </div>
  {:else}
    {#if site.info && !methods?.stripe && !methods?.freekassa && !methods?.paypal}
      <div class="panel c-pink">
        <p class="empty-note">{m.support_donate_unavailable()}</p>
      </div>
    {:else}
      <div class="panel checkout c-pink">
        <div class="checkout-amount">
          <label for="months">{m.support_donate_how_long()}</label>
          <input id="months" type="range" min="1" max="24" step="1" bind:value={months} />
          <div class="price">
            <b>£{price}</b>
            {m.support_donate_for()} <b>{m.support_donate_months({ count: months })}</b>
          </div>
          <div class="gift">
            {m.support_donate_donating_for()} <b>{payee?.username}</b>
            <button class="link-button" type="button" onclick={() => (gifting = !gifting)}>
              <i class="fa-solid fa-gift"></i>{m.support_donate_gift()}
            </button>
          </div>
          {#if gifting}
            <input
              class="gift-search"
              type="search"
              bind:value={search}
              placeholder={m.support_donate_search()}
            />
            {#each found as player (player.id)}
              <button
                class="link-button"
                type="button"
                onclick={() => {
                  target = player;
                  search = '';
                  found = [];
                }}
              >
                {player.username}
              </button>
            {/each}
          {/if}
        </div>
        <div class="checkout-methods">
          {#if methods?.stripe}
            <button class="pay stripe" type="button" disabled={busy} onclick={() => pay('stripe')}>
              <span
                ><i class="fa-brands fa-stripe-s"></i>Stripe
                <em>{m.support_donate_recommended()}</em></span
              >
              <small>
                <b>{m.support_donate_bonus()}</b>{m.support_donate_bonus_months({
                  count: +(months * 1.1).toFixed(1)
                })}
              </small>
            </button>
          {/if}
          {#if methods?.paypal && payee}
            <form
              action="https://www.paypal.com/cgi-bin/webscr"
              method="post"
              class="pay paypal-form"
            >
              <input type="hidden" name="cmd" value="_xclick" />
              <input type="hidden" name="business" value={methods.paypal} />
              <input
                type="hidden"
                name="item_name"
                value="{months} month(s) RealistikOsu supporter for {payee.username}"
              />
              <input type="hidden" name="amount" value={price} />
              <input type="hidden" name="currency_code" value="GBP" />
              <input type="hidden" name="custom" value="username={payee.username}" />
              <input type="hidden" name="lc" value="GB" />
              <button class="pay paypal" type="submit">
                <span><i class="fa-brands fa-paypal"></i>PayPal</span>
                <small>{m.support_donate_paypal_card()}</small>
              </button>
            </form>
          {/if}
          {#if methods?.freekassa}
            <button
              class="pay freekassa"
              type="button"
              disabled={busy}
              onclick={() => pay('freekassa')}
            >
              <span><i class="fa-solid fa-credit-card"></i>FreeKassa</span>
            </button>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</main>
