<script lang="ts">
  import { fade } from 'svelte/transition';
  import { ms } from '$lib/motion';

  // Imagemap areas carry a data-tooltip. One floating tip shows it above the area, or below when there is no
  // room, so a panel around the image can't clip it.
  let text = $state('');
  let left = $state(0);
  let top = $state(0);
  let shown = $state(false);
  let tip = $state<HTMLElement>();

  const areaOf = (event: Event) =>
    (event.target as Element).closest?.<HTMLElement>('.bbcode-imagemap-tooltip[data-tooltip]') ??
    null;

  function show(event: Event) {
    const area = areaOf(event);
    if (!area) return;
    text = area.dataset.tooltip ?? '';
    shown = true;
    requestAnimationFrame(() => {
      if (!tip) return;
      const box = area.getBoundingClientRect();
      const half = tip.offsetWidth / 2;
      left = Math.min(Math.max(box.left + box.width / 2, half + 8), innerWidth - half - 8);
      const above = box.top - tip.offsetHeight - 8;
      top = above > 8 ? above : box.bottom + 8;
    });
  }

  const hide = (event: Event) => {
    if ((event.target as Element).closest?.('.bbcode-imagemap-tooltip')) shown = false;
  };
</script>

<svelte:window
  onmouseover={show}
  onfocusin={show}
  onmouseout={hide}
  onfocusout={hide}
  onscrollcapture={() => (shown = false)}
/>

{#if shown}
  <div
    class="float-tip"
    bind:this={tip}
    style="left: {left}px; top: {top}px"
    transition:fade={{ duration: ms(120) }}
  >
    {text}
  </div>
{/if}
