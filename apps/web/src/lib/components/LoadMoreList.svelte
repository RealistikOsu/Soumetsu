<script lang="ts" generics="T">
  import { untrack, type Snippet } from 'svelte';
  import { m } from '$lib/paraglide/messages';

  let {
    load,
    limit = 5,
    colour,
    key,
    row,
    class: className = ''
  }: {
    load: (page: number, signal: AbortSignal) => Promise<T[]>;
    limit?: number;
    colour: string;
    key: (item: T) => string | number;
    row: Snippet<[T]>;
    class?: string;
  } = $props();

  let items = $state.raw<T[]>([]);
  let page = $state(0);
  let status = $state<'loading' | 'ready' | 'error'>('loading');
  let more = $state(false);
  let controller: AbortController | undefined;

  async function next() {
    controller?.abort();
    const mine = (controller = new AbortController());
    status = 'loading';
    try {
      const rows = await load(page + 1, mine.signal);
      if (mine.signal.aborted) return;
      items = [...items, ...rows];
      page += 1;
      more = rows.length === limit;
      status = 'ready';
    } catch {
      if (mine.signal.aborted) return;
      status = 'error';
    }
  }

  $effect(() => {
    untrack(next);
    return () => controller?.abort();
  });
</script>

{#if status === 'error' && items.length === 0}
  <div class="panel {colour}">
    <p class="empty-note">{m.common_load_failed()}</p>
  </div>
{:else if status === 'ready' && items.length === 0}
  <div class="panel {colour}"><p class="empty-note">{m.common_nothing_here()}</p></div>
{:else}
  <div class="panel score-list {colour} {className}">
    {#each items as item (key(item))}
      {@render row(item)}
    {/each}
    {#if status === 'loading'}
      {#each [0, 1, 2] as n (n)}
        <div class="score-row" aria-hidden="true">
          <div class="score-bg"></div>
          <div class="score-info"><span class="skel" style="width: 60%"></span></div>
        </div>
      {/each}
    {/if}
    {#if more && status !== 'loading'}
      <a
        class="more"
        href="#more"
        onclick={(event) => {
          event.preventDefault();
          next();
        }}
      >
        {m.common_load_more()}
      </a>
    {/if}
  </div>
{/if}
