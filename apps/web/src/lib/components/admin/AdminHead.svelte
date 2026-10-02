<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    heading,
    text,
    extra
  }: {
    heading: string;
    text: string;
    extra?: Snippet;
  } = $props();
</script>

<div class="admin-head">
  <div>
    <h1>{heading}</h1>
    <p>{text}</p>
  </div>
  {@render extra?.()}
</div>
