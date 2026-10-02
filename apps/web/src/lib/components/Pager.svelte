<script lang="ts">
  let {
    page,
    hasNext,
    pages,
    onpage
  }: {
    page: number;
    hasNext: boolean;
    // Left out when the total isn't known, then the numbers stop at the page after this one.
    pages?: number;
    onpage: (page: number) => void;
  } = $props();

  // The ends and the pages around this one, with a gap marker where numbers are skipped.
  const numbers = $derived.by(() => {
    const last = pages ?? (hasNext ? page + 1 : page);
    const around = [page - 2, page - 1, page, page + 1, page + 2];
    const sorted = [1, ...around, last]
      .filter((n, i, all) => n >= 1 && n <= last && all.indexOf(n) === i)
      .sort((a, b) => a - b);
    // A gap of one page is shown as that page, since a marker wouldn't be shorter.
    return sorted.flatMap((n, i) => {
      const skipped = i > 0 ? n - sorted[i - 1] - 1 : 0;
      if (skipped === 1) return [n - 1, n];
      return skipped > 1 ? [null, n] : [n];
    });
  });

  const go = (event: Event, target: number) => {
    event.preventDefault();
    onpage(target);
  };
</script>

<nav class="pager" aria-label="Pages">
  <a
    class:disabled={page <= 1}
    href="?p={page - 1}"
    onclick={(event) => page > 1 && go(event, page - 1)}
  >
    <i class="fa-solid fa-chevron-left"></i><span class="pager-label">Previous</span>
  </a>
  {#each numbers as n, i (n ?? `gap-${i}`)}
    {#if n === null}
      <span class="gap">…</span>
    {:else}
      <a
        class:active={n === page}
        class:far={Math.abs(n - page) === 2}
        href="?p={n}"
        aria-current={n === page ? 'page' : undefined}
        onclick={(event) => go(event, n)}
      >
        {n}
      </a>
    {/if}
  {/each}
  <a
    class:disabled={!hasNext}
    href="?p={page + 1}"
    onclick={(event) => hasNext && go(event, page + 1)}
  >
    <span class="pager-label">Next</span><i class="fa-solid fa-chevron-right"></i>
  </a>
</nav>
