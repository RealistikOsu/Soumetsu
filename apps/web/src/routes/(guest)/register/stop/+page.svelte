<script lang="ts">
  import { page } from '$app/state';
  import Banner from '$lib/components/Banner.svelte';
  import { m } from '$lib/paraglide/messages';

  const name = $derived(page.url.searchParams.get('name') ?? m.auth_stop_someone());
</script>

<svelte:head><title>{m.auth_stop_title()} · RealistikOsu</title></svelte:head>

<Banner image="stop.png">
  <div>
    <h1>{m.auth_stop_title()}</h1>
    <p class="sub">{m.auth_stop_sub()}</p>
  </div>
</Banner>

<main class="wrap welcome">
  <div class="panel stop-box c-red">
    <div>
      <p class="lead">
        {m.auth_stop_lead_start()} <b>{name}</b>{m.auth_stop_lead_end()}
      </p>
      <ul>
        <li>{m.auth_stop_if_you({ name })}</li>
        <li>{m.auth_stop_if_not({ name })}</li>
        <li>
          {m.auth_stop_live_with_start({ name })}
          <a href="/discord">{m.auth_stop_discord_server()}</a>{m.auth_stop_live_with_end()}
        </li>
      </ul>
      <p class="muted">{m.auth_stop_network({ name })}</p>
      <div class="avatar-actions">
        <a class="btn btn-blue" href="/"
          ><i class="fa-solid fa-chevron-left"></i>{m.auth_stop_back()}</a
        >
      </div>
      <a class="camouflaged" href="/register?stopsign=1">{m.auth_stop_continue()}</a>
    </div>
    <img src="/img/peppy-mad.png" alt={m.auth_stop_peppy_alt()} />
  </div>
</main>
