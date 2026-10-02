<script lang="ts">
  import { query } from '$lib/api/query.svelte';
  import { stats } from '$lib/api/stats';
  import Banner from '$lib/components/Banner.svelte';
  import ConnectMethods from '$lib/components/ConnectMethods.svelte';
  import { number } from '$lib/format';

  const counts = query((signal) => stats(signal));
</script>

<svelte:head><title>Connecting · RealistikOsu</title></svelte:head>

<Banner image="connect.jpg">
  <div>
    <h1>Connecting</h1>
    <p class="sub">Two ways to play on RealistikOsu. Pick one.</p>
  </div>
</Banner>

<main class="wrap connect">
  <p class="lead">
    You're one step away from joining
    {counts.state.status === 'ready' ? number(counts.state.data.registered_users) : 'thousands of'}
    players on RealistikOsu. Once you connect, your profile goes public and you can set scores, join clans
    and play as much as you like.
  </p>

  <ConnectMethods />

  <p class="no-account">No account yet? <a href="/register">Register</a> first, then connect.</p>
</main>
