<script lang="ts">
  import { m } from '$lib/paraglide/messages';

  // 1 is Register, 2 Connect, 3 Play; 0 highlights none.
  let { current }: { current: number } = $props();

  const steps = [
    [m.home_journey_register(), 'c-green', 'fa-user-plus'],
    [m.home_journey_connect(), 'c-blue', 'fa-link'],
    [m.home_journey_play(), 'c-pink', 'fa-circle-play']
  ];
</script>

<ol class="journey">
  {#each steps as [name, colour, icon], i (name)}
    <li class="{colour} {i + 1 === current ? 'current' : ''}">
      <i class="fa-solid {icon}"></i>{name}
    </li>
  {/each}
</ol>
