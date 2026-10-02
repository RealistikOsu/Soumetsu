<script lang="ts">
  import { describe } from '$lib/api/messages';
  import { decoration, saveDecoration } from '$lib/api/linking';
  import { query } from '$lib/api/query.svelte';
  import { decorations } from '$lib/decorations';
  import { flash } from '$lib/flash.svelte';

  const loaded = query((signal) => decoration(signal));

  let chosen = $state('');
  let ready = $state(false);
  let busy = $state(false);

  $effect(() => {
    if (loaded.state.status !== 'ready' || ready) return;
    chosen = loaded.state.data.current ?? '';
    ready = true;
  });

  const unlocked = $derived(loaded.state.status === 'ready' ? loaded.state.data.unlocked : []);
  const groups = $derived(
    ['Default', 'Supporter', 'Staff']
      .map((category) => ({
        category,
        items: decorations.filter((d) => d.category === category)
      }))
      // Staff styles stay hidden from everyone else; locked supporter ones are shown greyed out.
      .filter(
        (group) => group.category !== 'Staff' || group.items.some((d) => unlocked.includes(d.key))
      )
  );

  async function save(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    try {
      await saveDecoration(chosen);
      flash.show(
        'success',
        chosen
          ? 'Your username decoration has been saved.'
          : 'Your username decoration has been cleared.'
      );
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

<h2 class="section-title c-yellow">
  <i class="fa-solid fa-palette"></i>Pick a username decoration
</h2>
{#if loaded.state.status === 'error'}
  <p class="panel empty-note">Couldn't load your decorations. Try again in a bit.</p>
{:else}
  <form onsubmit={save}>
    <div class="panel form-panel c-yellow">
      <div class="swatches">
        <label class="swatch">
          <input type="radio" name="decoration" value="" bind:group={chosen} /><span>None</span>
        </label>
      </div>
      {#each groups as group (group.category)}
        <h3 class="swatch-group">{group.category} <small>{group.items.length}</small></h3>
        <div class="swatches">
          {#each group.items as item (item.key)}
            {@const locked = !unlocked.includes(item.key)}
            <label class="swatch" class:locked>
              <input
                type="radio"
                name="decoration"
                value={item.key}
                bind:group={chosen}
                disabled={locked}
              />
              <span><b class="deco-{item.key}">{item.name}</b></span>
            </label>
          {/each}
        </div>
        {#if group.category === 'Supporter' && group.items.some((d) => !unlocked.includes(d.key))}
          <p class="faint">
            <a href="/donate"><b>Become a supporter</b></a> to unlock these decorations.
          </p>
        {/if}
      {/each}
    </div>
    <div class="form-actions">
      <button class="btn btn-blue" type="submit" disabled={busy || !ready}>Save settings</button>
    </div>
  </form>
{/if}
