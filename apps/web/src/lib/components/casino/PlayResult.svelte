<script lang="ts">
  import { number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';
  import { multiplier as times } from './GameShell.svelte';

  let { bet, payout, multiplier }: { bet: number; payout: number; multiplier: number } = $props();

  const won = $derived(payout >= bet);
</script>

<div class="cs-result cs-outcome" aria-live="polite">
  <b class="cs-mult" class:win={won} class:loss={!won}>{times(multiplier)}</b>
  {#if won}
    <span class="win">{m.casino_won({ count: payout, coins: number(payout) })}</span>
  {:else}
    <span class="loss">{m.casino_lost({ count: bet - payout, coins: number(bet - payout) })}</span>
  {/if}
</div>
