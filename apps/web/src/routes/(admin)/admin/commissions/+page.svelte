<script lang="ts">
  import {
    commissionSettings,
    commissionTemplates,
    setCommissionSettings,
    type CommissionSettings,
    type CommissionTemplate
  } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import { countChanges } from '$lib/components/admin/changes';
  import SaveBar from '$lib/components/admin/SaveBar.svelte';
  import { taskText, templateKeys } from '$lib/commissions';
  import { flash } from '$lib/flash.svelte';

  interface Form {
    tasksPerDay: number;
    minDayPoints: number;
    thresholds: { points: number; coins: number }[];
    tierPoints: { easy: number; medium: number; hard: number };
    weights: Record<string, number | null>;
    artists: string;
    famousMaps: string;
    lazerTasks: boolean;
  }

  let version = $state(0);
  let busy = $state(false);
  let form = $state<Form | null>(null);

  const settings = query((signal) => {
    void version;
    return commissionSettings(signal);
  });

  const templates = query((signal) => commissionTemplates(signal));
  const infoOf = (key: string): CommissionTemplate | undefined =>
    templates.state.status === 'ready'
      ? templates.state.data.find((info) => info.key === key)
      : undefined;
  const describeTemplate = (key: string) => {
    const info = infoOf(key);
    return info?.example ? taskText({ template: key, params: info.example }) : key;
  };

  const toForm = (data: CommissionSettings): Form => {
    const copy = structuredClone($state.snapshot(data));
    return {
      ...copy,
      weights: Object.fromEntries(templateKeys.map((key) => [key, copy.weights[key] ?? null])),
      artists: copy.artists.join('\n'),
      famousMaps: copy.famousMaps.map((map) => `${map.beatmapId} ${map.name}`).join('\n')
    };
  };

  $effect(() => {
    if (settings.state.status === 'ready') form = toForm(settings.state.data);
  });

  const loadedForm = $derived(
    settings.state.status === 'ready' ? toForm(settings.state.data) : null
  );
  const changes = $derived(countChanges(form, loadedForm));

  function build(current: Form): CommissionSettings | null {
    const famousMaps = [];
    for (const line of current.famousMaps.split('\n')) {
      if (!line.trim()) continue;
      const match = /^(\d+)\s+(.+)$/.exec(line.trim());
      if (!match) {
        flash.show('error', `Famous map line "${line.trim()}" should be "beatmapId name".`);
        return null;
      }
      famousMaps.push({ beatmapId: Number(match[1]), name: match[2].trim() });
    }
    const weights: Record<string, number> = {};
    for (const [key, value] of Object.entries(current.weights)) {
      if (value === null || value === undefined || Number(value) === 1) continue;
      weights[key] = Number(value);
    }
    return {
      tasksPerDay: Number(current.tasksPerDay),
      minDayPoints: Number(current.minDayPoints),
      thresholds: current.thresholds.map((t) => ({
        points: Number(t.points),
        coins: Number(t.coins)
      })),
      tierPoints: {
        easy: Number(current.tierPoints.easy),
        medium: Number(current.tierPoints.medium),
        hard: Number(current.tierPoints.hard)
      },
      weights,
      artists: current.artists
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      famousMaps,
      lazerTasks: current.lazerTasks
    };
  }

  async function save() {
    if (!form) return;
    const body = build(form);
    if (!body) return;
    busy = true;
    try {
      await setCommissionSettings(body);
      flash.show('success', 'Commission settings saved.');
      version++;
    } catch (error) {
      flash.show('error', describe(error));
    }
    busy = false;
  }
</script>

<AdminHead heading="Commissions" text="Daily tasks, rewards and what the generator picks from." />

{#if form}
  <div class="user-split">
    <div class="user-main">
      <section class="user-box">
        <h2>Day</h2>
        <div class="set-row">
          <div>
            <b>Lazer commissions</b>
            <p>
              Off rolls no tasks that need lazer, and swaps out the ones players already rolled
              today.
            </p>
          </div>
          <label class="switch">
            <input type="checkbox" bind:checked={form.lazerTasks} /><span></span>
          </label>
        </div>
        <div class="set-row">
          <div>
            <b>Tasks per day</b>
            <p>How many commissions each player gets.</p>
          </div>
          <input
            class="num-in"
            type="number"
            min="1"
            step="1"
            aria-label="Tasks per day"
            bind:value={form.tasksPerDay}
          />
        </div>
        <div class="set-row">
          <div>
            <b>Minimum day points</b>
            <p>Points needed before chests unlock.</p>
          </div>
          <input
            class="num-in"
            type="number"
            min="1"
            step="1"
            aria-label="Minimum day points"
            bind:value={form.minDayPoints}
          />
        </div>
      </section>

      <section class="user-box">
        <h2>Tier points</h2>
        <div class="tiers">
          {#each [['easy', 'Easy', 'c-green'], ['medium', 'Medium', 'c-yellow'], ['hard', 'Hard', 'c-red']] as const as [key, label, colour] (key)}
            <label class={colour}>
              {label}
              <input
                class="num-in"
                type="number"
                min="1"
                step="1"
                bind:value={form.tierPoints[key]}
              />
            </label>
          {/each}
        </div>
      </section>

      <section class="user-box">
        <h2>Template weights <small>Higher comes up more</small></h2>
        <div class="table-wrap in-box">
          <table class="board admin-table">
            <thead>
              <tr><th>Commission</th><th>Tier</th><th>Weight</th></tr>
            </thead>
            <tbody>
              {#each templateKeys as key (key)}
                {@const info = infoOf(key)}
                <tr>
                  <td>
                    {describeTemplate(key)}
                    <div class="note">{key}{info ? ` · ${info.family}` : ''}</div>
                  </td>
                  <td>
                    {#if info?.tier}
                      <span
                        class="admin-tag {info.tier === 'easy'
                          ? 'c-green'
                          : info.tier === 'medium'
                            ? 'c-yellow'
                            : 'c-red'}">{info.tier}</span
                      >
                    {/if}
                  </td>
                  <td>
                    <input
                      class="num-in"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="1"
                      aria-label="Weight for {key}"
                      bind:value={form.weights[key]}
                    />
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <aside>
      <section class="user-box">
        <h2>Rewards</h2>
        {#each form.thresholds as threshold, index (index)}
          <div class="set-row">
            <div>
              <b>Chest {index + 1}</b>
              <p>
                At
                <input
                  class="num-in small"
                  type="number"
                  min="1"
                  step="1"
                  aria-label="Chest {index + 1} points"
                  bind:value={threshold.points}
                />
                points
              </p>
            </div>
            <span class="coin-in">
              <input
                class="num-in"
                type="number"
                min="0"
                step="1"
                aria-label="Chest {index + 1} coins"
                bind:value={threshold.coins}
              /><i class="fa-solid fa-coins"></i>
            </span>
          </div>
        {/each}
      </section>
      <section class="user-box">
        <h2><label for="cm-artists">Artists</label> <small>One per line</small></h2>
        <textarea id="cm-artists" rows="8" bind:value={form.artists}></textarea>
      </section>
      <section class="user-box">
        <h2><label for="cm-maps">Famous maps</label> <small>ID, then the name</small></h2>
        <textarea id="cm-maps" rows="6" bind:value={form.famousMaps}></textarea>
      </section>
    </aside>
  </div>

  <SaveBar
    {changes}
    {busy}
    ondiscard={() => loadedForm && (form = structuredClone($state.snapshot(loadedForm)))}
    onsave={save}
  />
{:else if settings.state.status === 'loading'}
  <span class="skel" style="width: 100%; height: 300px"></span>
{:else if settings.state.status === 'error'}
  <p class="panel empty-note">{describe(settings.state.error)}</p>
{/if}
