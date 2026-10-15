<script lang="ts">
  import { achievements, type Achievement } from '$lib/api/users';
  import { query } from '$lib/api/query.svelte';
  import { fullDate } from '$lib/format';
  import { m } from '$lib/paraglide/messages';
  import SectionTitle from './SectionTitle.svelte';

  let { id }: { id: number } = $props();

  const list = query((signal) => achievements(id, signal));
  const earned = $derived(
    list.state.status === 'ready' ? list.state.data.filter((a) => a.achieved) : []
  );
  const total = $derived(list.state.status === 'ready' ? list.state.data.length : 0);

  // Grouped like osu! does, going by the medal's file name since that's all that says what kind it is.
  const kinds = [
    { test: /-skill-pass-/, label: m.profile_achievements_group_pass },
    { test: /-skill-fc-/, label: m.profile_achievements_group_fc },
    { test: /-(combo|plays)-/, label: m.profile_achievements_group_dedication },
    { test: /^all-intro-/, label: m.profile_achievements_group_mods }
  ];
  const groups = $derived.by(() => {
    const kindOf = (medal: Achievement) => kinds.findIndex((kind) => kind.test.test(medal.file));
    return [
      ...kinds.map((kind, i) => ({ kind: i, label: kind.label })),
      { kind: -1, label: m.profile_achievements_group_other }
    ]
      .map((group) => ({
        ...group,
        medals: earned.filter((medal) => kindOf(medal) === group.kind)
      }))
      .filter((group) => group.medals.length > 0);
  });
</script>

<SectionTitle colour="c-purple" icon="fa-medal">
  {m.profile_achievements_title()}
  {#if list.state.status === 'ready'}<small
      >{m.profile_achievements_count({ earned: earned.length, total })}</small
    >{/if}
</SectionTitle>
<div class="panel medals c-purple">
  {#if list.state.status === 'error'}
    <p class="empty-note">{m.profile_achievements_error()}</p>
  {:else if list.state.status === 'ready' && earned.length === 0}
    <p class="empty-note">{m.profile_achievements_empty()}</p>
  {:else if list.state.status === 'ready'}
    {#each groups as group (group.kind)}
      <h3>{group.label()} <small>{group.medals.length}</small></h3>
      <div class="medal-group">
        {#each group.medals as medal (medal.id)}
          <button class="medal" type="button" aria-label={medal.name}>
            <img src="https://assets.ppy.sh/medals/web/{medal.file}.png" alt="" loading="lazy" />
            <span class="medal-tip">
              <b>{medal.name}</b>{medal.description}
              {#if medal.achieved_at}<small
                  >{m.profile_achievements_achieved({ date: fullDate(medal.achieved_at) })}</small
                >{/if}
            </span>
          </button>
        {/each}
      </div>
    {/each}
  {:else}
    <span class="skel" style="width: 100%; height: 120px"></span>
  {/if}
</div>
