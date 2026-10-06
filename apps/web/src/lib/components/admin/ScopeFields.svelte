<script lang="ts">
  import { modeNames, relaxNames } from '$lib/modes';

  let {
    modes = $bindable([0, 1, 2, 3]),
    types = $bindable(['va', 'rx', 'ap', 'lz'])
  }: {
    modes?: number[];
    types?: string[];
  } = $props();

  const slugs = ['va', 'rx', 'ap', 'lz'];
</script>

<div class="field">
  <span class="label">Modes</span>
  <div class="checks">
    {#each modeNames as name, mode (mode)}
      <label class="check">
        <input type="checkbox" value={mode} bind:group={modes} />
        <img src="/img/modes/mode-{mode}.png" alt="" />{name}
      </label>
    {/each}
  </div>
</div>
<div class="field">
  <span class="label">Types</span>
  <div class="checks">
    {#each relaxNames as name, i (i)}
      <label class="check"
        ><input type="checkbox" value={slugs[i]} bind:group={types} />{name}</label
      >
    {/each}
  </div>
</div>
