<script lang="ts">
  import { clanNamePattern, clanTagPattern } from '$lib/api/clans';
  import { m } from '$lib/paraglide/messages';

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
  <label for="clan-name">{m.clans_fields_name()}</label>
  <input id="clan-name" type="text" bind:value={name} required />
  <small class:error={nameBad}>
    {m.clans_fields_name_hint()} <code>'_[]-</code>
  </small>
</div>
<div class="field">
  <label for="clan-tag">{m.clans_fields_tag()}</label>
  <input id="clan-tag" type="text" bind:value={tag} required />
  <small class:error={tagBad}>{m.clans_fields_tag_hint()}</small>
</div>
<div class="field">
  <label for="clan-description"
    >{m.clans_fields_description()} <span class="faint">{m.clans_fields_optional()}</span></label
  >
  {#if multiline}
    <textarea id="clan-description" rows="4" bind:value={description}></textarea>
  {:else}
    <input
      id="clan-description"
      type="text"
      bind:value={description}
      placeholder={m.clans_fields_description_placeholder()}
    />
  {/if}
</div>
<div class="field">
  <label for="clan-icon"
    >{m.clans_fields_logo()} <span class="faint">{m.clans_fields_optional()}</span></label
  >
  <input
    id="clan-icon"
    type="file"
    accept="image/*"
    onchange={(event) => (icon = event.currentTarget.files?.[0] ?? null)}
  />
  <small>{m.clans_fields_logo_hint()}</small>
</div>
