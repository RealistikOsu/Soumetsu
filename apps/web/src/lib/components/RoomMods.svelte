<script lang="ts">
  import { modsText, type Mod } from '$lib/mods';
  import { m } from '$lib/paraglide/messages';

  let { required, allowed = [] }: { required: Mod[]; allowed?: Mod[] } = $props();

  const requiredText = $derived(modsText(required));
  const allowedText = $derived(allowed.map((mod) => mod.acronym).join(' '));
</script>

{#if requiredText}
  <span class="room-mods" title={m.rooms_required_mods()}>{requiredText}</span>
{/if}
{#if allowedText}
  <span class="room-allowed">{m.rooms_allowed_mods()}: {allowedText}</span>
{/if}
