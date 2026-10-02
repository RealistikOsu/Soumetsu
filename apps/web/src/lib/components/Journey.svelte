<script lang="ts">
  // 1 is Register, 2 Connect, 3 Play; 0 highlights none.
  let { current }: { current: number } = $props();

  const steps = [
    ['Register', 'c-green', 'fa-user-plus'],
    ['Connect', 'c-blue', 'fa-link'],
    ['Play', 'c-pink', 'fa-circle-play']
  ];
</script>

<ol class="journey">
  {#each steps as [name, colour, icon], i (name)}
    <li class="{colour} {i + 1 === current ? 'current' : ''}">
      <i class="fa-solid {icon}"></i>{name}
    </li>
  {/each}
</ol>
