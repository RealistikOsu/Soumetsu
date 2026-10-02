<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    open = $bindable(false),
    class: className = '',
    children
  }: {
    open?: boolean;
    class?: string;
    children: Snippet;
  } = $props();

  let dialog = $state<HTMLDialogElement>();

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  });
</script>

<dialog
  bind:this={dialog}
  class="dialog {className}"
  onclose={() => (open = false)}
  onclick={(event) => {
    if (event.target === dialog) open = false;
  }}
>
  {@render children()}
</dialog>
