<script lang="ts">
  import { clanIconUrl } from '$lib/assets';

  let {
    id,
    tag,
    size,
    preview
  }: {
    id?: number;
    tag: string;
    size: 'small' | 'large';
    // A local file the owner has picked but not saved yet.
    preview?: string | null;
  } = $props();

  let failedId = $state<number | undefined>();
  const letters = $derived(tag.trim().slice(0, size === 'small' ? 2 : 4));
  const src = $derived(preview ?? (id !== undefined && failedId !== id ? clanIconUrl(id) : null));
</script>

{#if src}
  <img class="clan-icon {size}" {src} alt="" loading="lazy" onerror={() => (failedId = id)} />
{:else}
  <span class="clan-icon {size}">{letters}</span>
{/if}
