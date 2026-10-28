<script lang="ts">
  import OddsField from './OddsField.svelte';

  // Edits owner[key] in place, whatever shape the game's odds take, so every game gets a form.
  let {
    owner,
    key,
    label
  }: { owner: Record<string, unknown> | unknown[]; key: string | number; label?: string } =
    $props();

  const value = $derived((owner as Record<string, unknown>)[key]);
  const set = (next: unknown) => ((owner as Record<string, unknown>)[key] = next);

  // instantCrash -> Instant crash, ge7 -> ge7
  const words = (name: string) => {
    const spaced = name.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ');
    return spaced[0].toUpperCase() + spaced.slice(1).toLowerCase();
  };

  const isNumbers = (list: unknown[]) =>
    list.length > 0 && list.every((v) => typeof v === 'number');
</script>

{#if typeof value === 'number'}
  <label class="odd">
    {#if label}<span>{label}</span>{/if}
    <input
      class="num-in"
      type="number"
      step="any"
      {value}
      oninput={(event) => set(Number(event.currentTarget.value))}
    />
  </label>
{:else if typeof value === 'boolean'}
  <label class="odd">
    {#if label}<span>{label}</span>{/if}
    <span class="switch">
      <input
        type="checkbox"
        checked={value}
        onchange={(event) => set(event.currentTarget.checked)}
      /><span></span>
    </span>
  </label>
{:else if typeof value === 'string'}
  <label class="odd">
    {#if label}<span>{label}</span>{/if}
    <input class="num-in text" {value} oninput={(event) => set(event.currentTarget.value)} />
  </label>
{:else if Array.isArray(value)}
  <div class="odd-group">
    {#if label}<span class="odd-label">{label} <small>{value.length}</small></span>{/if}
    {#if isNumbers(value)}
      <div class="odd-numbers">
        {#each value.keys() as index (index)}
          <OddsField owner={value} key={index} />
        {/each}
        <button
          class="act"
          type="button"
          aria-label="Remove the last one"
          disabled={value.length < 2}
          onclick={() => value.pop()}><i class="fa-solid fa-minus"></i></button
        >
        <button
          class="act"
          type="button"
          aria-label="Add one"
          onclick={() => value.push(value[value.length - 1])}
          ><i class="fa-solid fa-plus"></i></button
        >
      </div>
    {:else}
      <ol class="odd-rows">
        {#each value.keys() as index (index)}
          <li>
            <span class="faint">{index + 1}</span>
            <OddsField owner={value} key={index} />
            <button
              class="act"
              type="button"
              aria-label="Remove row {index + 1}"
              disabled={value.length < 2}
              onclick={() => value.splice(index, 1)}><i class="fa-solid fa-xmark"></i></button
            >
          </li>
        {/each}
      </ol>
      <button
        class="act"
        type="button"
        onclick={() => value.push(JSON.parse(JSON.stringify(value[value.length - 1])))}
      >
        <i class="fa-solid fa-plus"></i>Add row
      </button>
    {/if}
  </div>
{:else if value && typeof value === 'object'}
  <div class="odd-group" class:nested={label}>
    {#if label}<span class="odd-label">{label}</span>{/if}
    <div class="odd-fields">
      {#each Object.keys(value as Record<string, unknown>) as name (name)}
        <OddsField owner={value as Record<string, unknown>} key={name} label={words(name)} />
      {/each}
    </div>
  </div>
{/if}
