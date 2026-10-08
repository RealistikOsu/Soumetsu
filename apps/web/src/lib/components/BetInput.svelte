<script lang="ts">
  import { untrack } from 'svelte';
  import { number } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  let {
    value = $bindable(),
    min,
    max,
    balance,
    disabled = false
  }: {
    value: number;
    min: number;
    max: number;
    balance: number;
    disabled?: boolean;
  } = $props();

  const PRESETS = [10, 50, 100, 500, 1000];

  // Below the minimum the bet stays at the minimum and the server says no.
  const top = $derived(Math.max(min, Math.min(max, balance)));

  const clamp = (n: number) =>
    Math.min(top, Math.max(min, Number.isFinite(n) ? Math.floor(n) : min));
  const set = (n: number) => (value = clamp(n));

  $effect(() => {
    void top;
    untrack(() => set(value));
  });
</script>

<div class="cs-bet">
  <label>
    {m.casino_bet()}
    <input
      type="number"
      {min}
      max={top}
      step="1"
      inputmode="numeric"
      bind:value
      {disabled}
      onchange={() => set(value)}
    />
  </label>
  <div class="cs-chips">
    {#each PRESETS as preset (preset)}
      <button type="button" {disabled} onclick={() => set(preset)}>{number(preset)}</button>
    {/each}
    <button type="button" {disabled} onclick={() => set(value / 2)}>{m.casino_bet_half()}</button>
    <button type="button" {disabled} onclick={() => set(value * 2)}>
      {m.casino_bet_double()}
    </button>
    <button type="button" {disabled} onclick={() => set(top)}>{m.casino_bet_max()}</button>
  </div>
</div>
