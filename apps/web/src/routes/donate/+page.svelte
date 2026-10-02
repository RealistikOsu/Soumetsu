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

  const reasons = [
    [
      'c-blue',
      'fa-server',
      "We don't run it for free",
      'The server is free and always will be, but not on our end. We pay for it out of our own pockets.'
    ],
    [
      'c-purple',
      'fa-graduation-cap',
      'We are still students',
      'All of our staff are students without a steady income. Even a small donation goes a long way.'
    ],
    [
      'c-green',
      'fa-shield-heart',
      'No shady money',
      'This optional donation is the only money we ask for. We never sell or misuse your data.'
    ]
  ];

  const perks = [
    [
      'c-red',
      'fa-pen',
      'Unlimited username changes',
      'Change your name as often as you like, as long as it follows the rules.'
    ],
    [
      'c-yellow',
      'fa-wand-magic-sparkles',
      'Profile perks',
      'An incredibly cool supporter badge, your own profile banner and a custom badge.'
    ],
    [
      'c-purple',
      'fa-palette',
      'Supporter name decorations',
      'Extra username styles on top of the default ones. <span class="deco-samples"><b class="deco-sunset">Sunset</b> <b class="deco-fire">Fire</b> <b class="deco-ember">Ember</b> <b class="deco-sakura">Sakura</b></span> <a href="/settings/decoration">See them all</a>'
    ],
    [
      'c-teal',
      'fa-film',
      'Animated profile pictures',
      'Upload a GIF as your avatar and it plays everywhere it shows up.'
    ],
    [
      'c-discord',
      'fa-discord',
      'Discord privileges',
      'A supporter role on our Discord, with supporter-only channels.'
    ],
    [
      'c-orange',
      'fa-eraser',
      'Account wipe',
      'Hide that ridiculous play count or your 500 retries on Padoru. Ask for a wipe.'
    ]
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
    if (result === 'success')
      flash.show('success', 'Thank you! Your supporter will show up in a moment.');
    if (result === 'cancel') flash.show('warning', 'The payment was cancelled.');
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

<svelte:head><title>Support · RealistikOsu</title></svelte:head>

<Banner image="support.png" class="support-banner">
  <div>
    <h1>Support RealistikOsu</h1>
    <p class="sub">Keep the server running and get a few perks for it.</p>
  </div>
</Banner>

<main class="wrap support">
  {#if session.user && isSupporter(session.user.privileges)}
    <div class="panel supporter-box c-yellow">
      <i class="fa-solid fa-heart beating"></i>
      <div>
        <h2>You're already a supporter!</h2>
        {#if expires}
          <p>
            Your supporter expires
            <time
              datetime={new Date(expires * 1000).toISOString()}
              title={new Date(expires * 1000).toLocaleDateString('en-GB', { dateStyle: 'long' })}
            >
              on {new Date(expires * 1000).toLocaleDateString('en-GB', { dateStyle: 'long' })}
            </time>. Thank you for helping us keep RealistikOsu up and alive! &lt;3
          </p>
        {/if}
        <p class="faint">You can add more time below.</p>
      </div>
    </div>
  {/if}

  <SectionTitle colour="c-blue" icon="fa-circle-question">Did you know?</SectionTitle>
  <div class="perks three">
    {#each reasons as [colour, icon, name, text] (name)}
      <div class="perk {colour}">
        <i class="fa-solid {icon}"></i><b>{name}</b>
        <p>{text}</p>
      </div>
    {/each}
  </div>

  <SectionTitle colour="c-yellow" icon="fa-gift">Here's what you get</SectionTitle>
  <div class="perks">
    {#each perks as [colour, icon, name, text] (name)}
      <div class="perk {colour}">
        <i class="{icon === 'fa-discord' ? 'fa-brands' : 'fa-solid'} {icon}"></i>
        <b>{name}</b>
        <p>{@html text}</p>
      </div>
    {/each}
  </div>

  <SectionTitle colour="c-pink" icon="fa-heart">Get supporter</SectionTitle>
  {#if !session.user}
    <div class="panel c-pink">
      <p class="empty-note"><a href="/login?redir=/donate">Log in</a> to get supporter.</p>
    </div>
  {:else}
    {#if site.info && !methods?.stripe && !methods?.freekassa && !methods?.paypal}
      <div class="panel c-pink">
        <p class="empty-note">Payments are currently unavailable. Please try again later.</p>
      </div>
    {:else}
      <div class="panel checkout c-pink">
        <div class="checkout-amount">
          <label for="months">How long?</label>
          <input id="months" type="range" min="1" max="24" step="1" bind:value={months} />
          <div class="price">
            <b>£{price}</b> for <b>{months === 1 ? '1 month' : `${months} months`}</b>
          </div>
          <div class="gift">
            Donating for: <b>{payee?.username}</b>
            <button class="link-button" type="button" onclick={() => (gifting = !gifting)}>
              <i class="fa-solid fa-gift"></i>Gift it to someone
            </button>
          </div>
          {#if gifting}
            <input
              class="gift-search"
              type="search"
              bind:value={search}
              placeholder="Search for a player"
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
              <span><i class="fa-brands fa-stripe-s"></i>Stripe <em>Recommended</em></span>
              <small>
                <b>+10% time</b>: you get {+(months * 1.1).toFixed(1)} months
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
                <small>Or a card linked to PayPal</small>
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
