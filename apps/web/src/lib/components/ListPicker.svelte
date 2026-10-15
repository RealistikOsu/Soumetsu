<script lang="ts" generics="K extends string">
  import type { Snippet } from 'svelte';
  import { tabInk } from '@soumetsu/ui';

  let {
    items,
    value,
    onselect,
    extra
  }: {
    items: { key: K; label: string; icon: string; colour: string }[];
    value: K;
    onselect: (key: K) => void;
    extra?: Snippet;
  } = $props();

  const active = $derived(items.find((item) => item.key === value) ?? items[0]);

  // Lists slide in from the side of the one that was picked, like the mode panes.
  function pick(key: K) {
    const from = items.findIndex((item) => item.key === value);
    const to = items.findIndex((item) => item.key === key);
    document.documentElement.style.setProperty('--slide', String(Math.sign(to - from)));
    onselect(key);
  }
</script>

<!-- The headings of the lists double as the picker, each in its section's colour. -->
<div class="list-picker">
  <nav class={active.colour} use:tabInk>
    {#each items as item (item.key)}
      <a
        class={item.colour}
        class:active={item.key === value}
        href="#{item.key}"
        onclick={(event) => {
          event.preventDefault();
          pick(item.key);
        }}
      >
        <i class="fa-solid {item.icon}"></i>{item.label}
      </a>
    {/each}
  </nav>
  {@render extra?.()}
</div>
