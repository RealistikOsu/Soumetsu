<script lang="ts">
  import { query } from '$lib/api/query.svelte';
  import { stats } from '$lib/api/stats';
  import Banner from '$lib/components/Banner.svelte';
  import ConnectMethods from '$lib/components/ConnectMethods.svelte';
  import { number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  const counts = query((signal) => stats(signal));
</script>

<svelte:head><title>{m.auth_connect_title()} · RealistikOsu</title></svelte:head>

<Banner image="connect.jpg">
  <div>
    <h1>{m.auth_connect_title()}</h1>
    <p class="sub">{m.auth_connect_sub()}</p>
  </div>
</Banner>

<main class="wrap connect">
  <p class="lead">
    {counts.state.status === 'ready'
      ? m.auth_connect_lead_count({
          count: counts.state.data.registered_users,
          formatted: number(counts.state.data.registered_users)
        })
      : m.auth_connect_lead()}
  </p>

  <ConnectMethods />

  <p class="no-account">
    {m.auth_connect_no_account()}
    <a href="/register">{m.auth_connect_register_link()}</a>{m.auth_connect_no_account_end()}
  </p>
</main>
