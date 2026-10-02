<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { registerStatus, type AccountStatus } from '$lib/api/auth';
  import Banner from '$lib/components/Banner.svelte';
  import Journey from '$lib/components/Journey.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { flash } from '$lib/flash.svelte';

  const steps = [
    [
      '/login',
      'c-blue',
      'fa-right-to-bracket',
      'Log in',
      'Log in on the website with the account you just made.'
    ],
    ['/doc/rules', 'c-red', 'fa-scale-balanced', 'Rules', "In case you haven't read them yet."],
    ['/doc', 'c-green', 'fa-book', 'Documentation', 'For when you need help doing stuff.'],
    ['/discord', 'c-discord', 'fa-discord', 'Discord', 'Talk to other RealistikOsu players.']
  ];

  let status = $state<AccountStatus | null>(null);

  $effect(() => {
    const id = Number(page.url.searchParams.get('u'));
    registerStatus(id).then(
      (result) => {
        if (result === 'pending') goto(`/register/verify?u=${id}`, { replaceState: true });
        else status = result;
      },
      () => {
        flash.next('warning', 'Nope.');
        goto('/', { replaceState: true });
      }
    );
  });
</script>

<svelte:head>
  <title>{status === 'banned' ? 'Welcome back' : 'Welcome'} · RealistikOsu</title>
</svelte:head>

{#if status === 'banned'}
  <Banner image="stop.png">
    <div>
      <h1>Welcome back!</h1>
      <p class="sub">Congratulations for not reading things.</p>
    </div>
  </Banner>

  <main class="wrap welcome">
    <div class="panel banned-box c-red">
      <i class="fa-solid fa-ban"></i>
      <div>
        <h2>Multiaccounts are not allowed on RealistikOsu</h2>
        <p>
          Your new account has been <b>banned</b> and your main account has been
          <b>restricted</b>. You can appeal in a month by joining our
          <a href="/discord">Discord server</a> and contacting one of our staff members.
        </p>
        <p class="faint">You better read the <a href="/doc/rules">rules</a> next time.</p>
      </div>
    </div>
  </main>
{:else if status === 'active'}
  <Banner image="welcome.jpg">
    <div>
      <h1>Welcome to RealistikOsu!</h1>
      <p class="sub">We're glad to have you here.</p>
    </div>
  </Banner>

  <main class="wrap welcome">
    <div class="panel welcome-box c-green">
      <Journey current={3} />
      <p>
        <b>Your account is now active.</b> You can play on RealistikOsu and log in on the website.
      </p>
    </div>

    <SectionTitle colour="c-yellow" icon="fa-compass">A few things to check out</SectionTitle>
    <div class="perks">
      {#each steps as [href, colour, icon, name, text] (href)}
        <a class="perk {colour}" {href}>
          <i class="{icon === 'fa-discord' ? 'fa-brands' : 'fa-solid'} {icon}"></i>
          <b>{name}</b>
          <p>{text}</p>
        </a>
      {/each}
    </div>
  </main>
{/if}
