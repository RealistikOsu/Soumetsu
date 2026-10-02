<script lang="ts">
  import { bbcodeBoxes, bbcodeToHtml } from '$lib/bbcode';
  import { ms } from '$lib/motion';

  let { content }: { content: string } = $props();

  const html = $derived(bbcodeToHtml(content));

  let page = $state<HTMLElement>();
  let open = $state(false);
  let overflowing = $state(false);

  // Short pages have nothing to expand, so the toggle only shows once the content outgrows the cut.
  $effect(() => {
    open = false;
    overflowing = false;
    if (!page || !html) return;
    const observer = new ResizeObserver(() => {
      overflowing = open || page!.scrollHeight > page!.clientHeight + 1;
    });
    observer.observe(page);
    return () => observer.disconnect();
  });

  // The cut height is animated to the content's height and then released, so boxes opened inside keep growing it.
  function toggle(event: MouseEvent) {
    event.preventDefault();
    open = !open;
    if (!page) return;
    page.style.transitionDuration = `${ms(450)}ms`;
    if (open) {
      page.style.maxHeight = `${page.scrollHeight}px`;
      setTimeout(() => open && (page!.style.maxHeight = 'none'), ms(450));
    } else {
      page.style.maxHeight = `${page.scrollHeight}px`;
      page.getBoundingClientRect();
      page.style.maxHeight = '';
    }
  }
</script>

<div class="userpage userpage-cut" bind:this={page} use:bbcodeBoxes>{@html html}</div>
{#if overflowing}
  <a class="more" href="#all" onclick={toggle}>{open ? 'Show less' : 'Show all'}</a>
{/if}
