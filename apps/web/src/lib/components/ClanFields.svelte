<script lang="ts">
  import { clanNamePattern, clanTagPattern } from '$lib/api/clans';

  let {
    name = $bindable(''),
    tag = $bindable(''),
    description = $bindable(''),
    icon = $bindable<File | null>(null),
    multiline = false
  }: {
    name?: string;
    tag?: string;
    description?: string;
    icon?: File | null;
    multiline?: boolean;
  } = $props();

  const nameBad = $derived(name !== '' && !clanNamePattern.test(name.trim()));
  const tagBad = $derived(tag !== '' && !clanTagPattern.test(tag.trim()));
</script>

<div class="field">
  <label for="clan-name">Clan name</label>
  <input id="clan-name" type="text" bind:value={name} required />
  <small class:error={nameBad}>
    2 to 15 characters: letters, numbers, spaces and <code>'_[]-</code>
  </small>
</div>
<div class="field">
  <label for="clan-tag">Clan tag</label>
  <input id="clan-tag" type="text" bind:value={tag} required />
  <small class:error={tagBad}>
    2 to 6 letters or numbers, shown in square brackets before members' names
  </small>
</div>
<div class="field">
  <label for="clan-description">Description <span class="faint">(optional)</span></label>
  {#if multiline}
    <textarea id="clan-description" rows="4" bind:value={description}></textarea>
  {:else}
    <input
      id="clan-description"
      type="text"
      bind:value={description}
      placeholder="What your clan is about"
    />
  {/if}
</div>
<div class="field">
  <label for="clan-icon">Logo <span class="faint">(optional)</span></label>
  <input
    id="clan-icon"
    type="file"
    accept="image/*"
    onchange={(event) => (icon = event.currentTarget.files?.[0] ?? null)}
  />
  <small>A square image works best.</small>
</div>
