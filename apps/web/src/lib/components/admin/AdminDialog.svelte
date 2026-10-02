<script lang="ts">
  import type { Snippet } from 'svelte';
  import Dialog from '../Dialog.svelte';

  let {
    open = $bindable(false),
    title,
    colour = 'c-blue',
    size = '',
    children,
    footer
  }: {
    open?: boolean;
    title: string;
    colour?: string;
    size?: string;
    children: Snippet;
    footer?: Snippet;
  } = $props();
</script>

<Dialog bind:open class="card-dialog {colour} {size}">
  <header>
    <h2>{title}</h2>
    <button class="dialog-close" aria-label="Close" onclick={() => (open = false)}>
      <i class="fa-solid fa-xmark"></i>
    </button>
  </header>
  <div class="dialog-body">{@render children()}</div>
  {#if footer}<footer>{@render footer()}</footer>{/if}
</Dialog>
