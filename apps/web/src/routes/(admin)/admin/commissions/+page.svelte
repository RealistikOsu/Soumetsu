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
    dayStartHour: number;
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
      lazerTasks: current.lazerTasks,
      dayStartHour: Number(current.dayStartHour)
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
  <h2 class="section-title c-green"><i class="fa-solid fa-sliders"></i>Day</h2>
  <div class="panel form-panel admin-form settings-form c-green">
    <div class="setting">
      <div>
        <b>Lazer commissions</b>
        <p>
          Off rolls no tasks that need lazer, and swaps out the ones players already rolled today.
        </p>
      </div>
      <label class="switch">
        <input type="checkbox" bind:checked={form.lazerTasks} /><span></span>
      </label>
    </div>
    <div class="field-row">
      <div class="field">
        <label for="cm-tasks">Tasks per day</label>
        <input id="cm-tasks" type="number" min="1" step="1" bind:value={form.tasksPerDay} />
      </div>
      <div class="field">
        <label for="cm-min">Minimum day points</label>
        <input id="cm-min" type="number" min="1" step="1" bind:value={form.minDayPoints} />
      </div>
      <div class="field">
        <label for="cm-hour">New day at (hour, UTC)</label>
        <input
          id="cm-hour"
          type="number"
          min="0"
          max="23"
          step="1"
          bind:value={form.dayStartHour}
        />
      </div>
    </div>
  </div>

  <h2 class="section-title c-green"><i class="fa-solid fa-coins"></i>Rewards</h2>
  <div class="panel form-panel admin-form settings-form c-green">
    {#each form.thresholds as threshold, index (index)}
      <div class="field-row">
        <div class="field">
          <label for="cm-points-{index}">Chest {index + 1} points</label>
          <input
            id="cm-points-{index}"
            type="number"
            min="1"
            step="1"
            bind:value={threshold.points}
          />
        </div>
        <div class="field">
          <label for="cm-coins-{index}">Chest {index + 1} coins</label>
          <input
            id="cm-coins-{index}"
            type="number"
            min="0"
            step="1"
            bind:value={threshold.coins}
          />
        </div>
      </div>
    {/each}
  </div>

  <h2 class="section-title c-green"><i class="fa-solid fa-layer-group"></i>Tier points</h2>
  <div class="panel form-panel admin-form settings-form c-green">
    <div class="field-row">
      <div class="field">
        <label for="cm-easy">Easy</label>
        <input id="cm-easy" type="number" min="1" step="1" bind:value={form.tierPoints.easy} />
      </div>
      <div class="field">
        <label for="cm-medium">Medium</label>
        <input id="cm-medium" type="number" min="1" step="1" bind:value={form.tierPoints.medium} />
      </div>
      <div class="field">
        <label for="cm-hard">Hard</label>
        <input id="cm-hard" type="number" min="1" step="1" bind:value={form.tierPoints.hard} />
      </div>
    </div>
  </div>

  <h2 class="section-title c-green"><i class="fa-solid fa-user-astronaut"></i>Artists</h2>
  <div class="panel form-panel admin-form settings-form c-green">
    <div class="field">
      <label for="cm-artists">One artist per line</label>
      <textarea id="cm-artists" rows="8" bind:value={form.artists}></textarea>
    </div>
  </div>

  <h2 class="section-title c-green"><i class="fa-solid fa-star"></i>Famous maps</h2>
  <div class="panel form-panel admin-form settings-form c-green">
    <div class="field">
      <label for="cm-maps">One per line: beatmap ID, then the name</label>
      <textarea id="cm-maps" rows="6" bind:value={form.famousMaps}></textarea>
    </div>
  </div>

  <h2 class="section-title c-green"><i class="fa-solid fa-scale-balanced"></i>Template weights</h2>
  <div class="table-wrap">
    <table class="board admin-table c-green">
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
            <td class="note">{info?.tier ?? ''}</td>
            <td>
              <input
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

  <div class="panel form-panel admin-form settings-form c-green">
    <button class="btn btn-blue" type="button" disabled={busy} onclick={save}>
      <i class="fa-solid fa-floppy-disk"></i>Save
    </button>
  </div>
{:else if settings.state.status === 'loading'}
  <div class="panel form-panel c-green">
    <span class="skel" style="width: 100%; height: 22px"></span>
  </div>
{:else if settings.state.status === 'error'}
  <p class="empty-note">{describe(settings.state.error)}</p>
{/if}
