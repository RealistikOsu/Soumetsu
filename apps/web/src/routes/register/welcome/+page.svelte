<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { registerStatus, type AccountStatus } from '$lib/api/auth';
  import Banner from '$lib/components/Banner.svelte';
  import Journey from '$lib/components/Journey.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { flash } from '$lib/flash.svelte';
  import { m } from '$lib/paraglide/messages';

  const steps = [
    ['/login', 'c-blue', 'fa-right-to-bracket', m.auth_log_in(), m.auth_welcome_step_login()],
    [
      '/doc/rules',
      'c-red',
      'fa-scale-balanced',
      m.auth_welcome_step_rules(),
      m.auth_welcome_step_rules_text()
    ],
    ['/doc', 'c-green', 'fa-book', m.auth_welcome_step_docs(), m.auth_welcome_step_docs_text()],
    ['/discord', 'c-discord', 'fa-discord', 'Discord', m.auth_welcome_step_discord_text()]
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
        flash.next('warning', m.auth_nope());
        goto('/', { replaceState: true });
      }
    );
  });
</script>

<svelte:head>
  <title
    >{status === 'banned' ? m.auth_welcome_back_title() : m.auth_welcome_title()} · RealistikOsu</title
  >
</svelte:head>

{#if status === 'banned'}
  <Banner image="stop.png">
    <div>
      <h1>{m.auth_welcome_back()}</h1>
      <p class="sub">{m.auth_welcome_back_sub()}</p>
    </div>
  </Banner>

  <main class="wrap welcome">
    <div class="panel banned-box c-red">
      <i class="fa-solid fa-ban"></i>
      <div>
        <h2>{m.auth_welcome_banned_heading()}</h2>
        <p>
          {m.auth_welcome_banned_start()}
          <b>{m.auth_welcome_banned_word()}</b>{m.auth_welcome_banned_middle()}
          <b>{m.auth_welcome_restricted_word()}</b>{m.auth_welcome_banned_appeal()}
          <a href="/discord">{m.auth_welcome_discord_server()}</a>{m.auth_welcome_banned_end()}
        </p>
        <p class="faint">
          {m.auth_welcome_rules_start()}
          <a href="/doc/rules">{m.auth_welcome_rules_link()}</a>{m.auth_welcome_rules_end()}
        </p>
      </div>
    </div>
  </main>
{:else if status === 'active'}
  <Banner image="welcome.jpg">
    <div>
      <h1>{m.auth_welcome_heading()}</h1>
      <p class="sub">{m.auth_welcome_sub()}</p>
    </div>
  </Banner>

  <main class="wrap welcome">
    <div class="panel welcome-box c-green">
      <Journey current={3} />
      <p>
        <b>{m.auth_welcome_active()}</b>
        {m.auth_welcome_active_text()}
      </p>
    </div>

    <SectionTitle colour="c-yellow" icon="fa-compass">{m.auth_welcome_check_out()}</SectionTitle>
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
