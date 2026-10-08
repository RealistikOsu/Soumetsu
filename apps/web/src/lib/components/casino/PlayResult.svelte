<script lang="ts">
  import { multiplier as times } from '$lib/casino';
  import { number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  let { bet, payout, multiplier }: { bet: number; payout: number; multiplier: number } = $props();
</script>

<div class="cs-result cs-outcome" aria-live="polite">
  <b class="cs-mult" class:win={payout > bet} class:loss={payout < bet}>{times(multiplier)}</b>
  {#if payout > bet}
    <span class="win">{m.casino_won({ count: payout, coins: number(payout) })}</span>
  {:else if payout < bet}
    <span class="loss">{m.casino_lost({ count: bet - payout, coins: number(bet - payout) })}</span>
  {/if}
</div>
