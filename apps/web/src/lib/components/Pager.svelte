<script lang="ts">
  let {
    page,
    hasNext,
    onpage
  }: {
    page: number;
    hasNext: boolean;
    onpage: (page: number) => void;
  } = $props();
</script>

<nav class="pager">
  <a
    class:disabled={page <= 1}
    href="?p={page - 1}"
    onclick={(event) => {
      event.preventDefault();
      if (page > 1) onpage(page - 1);
    }}
  >
    <i class="fa-solid fa-chevron-left"></i>Previous
  </a>
  <span>Page <b>{page}</b></span>
  <a
    class:disabled={!hasNext}
    href="?p={page + 1}"
    onclick={(event) => {
      event.preventDefault();
      if (hasNext) onpage(page + 1);
    }}
  >
    Next<i class="fa-solid fa-chevron-right"></i>
  </a>
</nav>
