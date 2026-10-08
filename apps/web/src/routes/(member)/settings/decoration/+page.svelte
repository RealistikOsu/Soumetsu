<script lang="ts">
  import { describe } from '$lib/api/messages';
  import { decoration, saveDecoration } from '$lib/api/linking';
  import { query } from '$lib/api/query.svelte';
  import { decorations, type Decoration } from '$lib/decorations';
  import { flash } from '$lib/flash.svelte';
  import { m } from '$lib/paraglide/messages';

  const loaded = query((signal) => decoration(signal));

  let chosen = $state('');
  let ready = $state(false);
  let busy = $state(false);

  $effect(() => {
    if (loaded.state.status !== 'ready' || ready) return;
    chosen = loaded.state.data.current ?? '';
    ready = true;
  });

  const groupNames: Record<Decoration['category'], () => string> = {
    Default: m.settings_decoration_group_default,
    Supporter: m.settings_decoration_group_supporter,
    Staff: m.settings_decoration_group_staff,
    Shop: m.settings_decoration_group_shop
  };

  const unlocked = $derived(loaded.state.status === 'ready' ? loaded.state.data.unlocked : []);
  const groups = $derived(
    (['Default', 'Supporter', 'Staff', 'Shop'] as const)
      .map((category) => ({
        category,
        items: decorations.filter((d) => d.category === category)
      }))
      // Staff styles stay hidden until unlocked; locked supporter and shop ones are shown greyed out.
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
        chosen ? m.settings_decoration_saved() : m.settings_decoration_cleared()
      );
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

<h2 class="section-title c-yellow">
  <i class="fa-solid fa-palette"></i>{m.settings_decoration_title()}
</h2>
{#if loaded.state.status === 'error'}
  <p class="panel empty-note">{m.settings_decoration_load_failed()}</p>
{:else}
  <form onsubmit={save}>
    <div class="panel form-panel c-yellow">
      <div class="swatches">
        <label class="swatch">
          <input type="radio" name="decoration" value="" bind:group={chosen} /><span
            >{m.settings_none()}</span
          >
        </label>
      </div>
      {#each groups as group (group.category)}
        <h3 class="swatch-group">
          {groupNames[group.category]()} <small>{group.items.length}</small>
        </h3>
        <div class="swatches">
          {#each group.items as item (item.key)}
            {@const locked = !unlocked.includes(item.key)}
            <div class="swatch-cell">
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
              {#if locked && (group.category === 'Supporter' || group.category === 'Shop')}
                <a class="swatch-buy" href="/shop">{m.settings_decoration_buy()}</a>
              {/if}
            </div>
          {/each}
        </div>
        {#if group.category === 'Supporter' && group.items.some((d) => !unlocked.includes(d.key))}
          <p class="faint">
            <a href="/donate"><b>{m.settings_decoration_unlock_link()}</b></a
            >{m.settings_decoration_unlock_end()}
          </p>
        {/if}
      {/each}
    </div>
    <div class="form-actions">
      <button class="btn btn-blue" type="submit" disabled={busy || !ready}
        >{m.settings_save_settings()}</button
      >
    </div>
  </form>
{/if}
