<script lang="ts">
  let {
    value,
    hit = false,
    other = false,
    empty = false
  }: { value: string; hit?: boolean; other?: boolean; empty?: boolean } = $props();

  let copied = $state(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    copied = true;
    setTimeout(() => (copied = false), 1000);
  }
</script>

<button
  class="hash"
  class:hit
  class:other
  class:empty
  class:copied
  type="button"
  title={empty ? 'Sent when the client cannot read this part. Not counted as a match.' : value}
  onclick={copy}
>
  {#if empty}empty{:else if copied}copied{:else}{value.slice(0, 8)}…{value.slice(-4)}{/if}
</button>
