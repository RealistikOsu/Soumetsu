<script lang="ts">
  import { mirrorBeatmap } from '$lib/api/mirror';
  import { query } from '$lib/api/query.svelte';
  import type { ScoreWithBeatmap } from '$lib/api/scores';
  import { coverUrl, replayUrl } from '$lib/assets';
  import { starColour, starTextColour } from '$lib/beatmaps';
  import { number, songParts, timeAgo } from '$lib/format';
  import { gradeClass, gradeLabel, gradeOf } from '$lib/grades';
  import { modeNames } from '$lib/modes';
  import { modsText } from '$lib/mods';
  import Dialog from './Dialog.svelte';

  let {
    score,
    open = $bindable(false)
  }: {
    score: ScoreWithBeatmap | null;
    open?: boolean;
  } = $props();

  const hitLabels = [
    ['300s', '100s', '50s', 'Gekis', 'Katus', 'Misses'],
    ['GREATs', 'GOODs', '50s', 'GREATs (Gekis)', 'GOODs (Katus)', 'Misses'],
    ['Fruits (300s)', 'Ticks (100s)', 'Droplets', 'Gekis', 'Droplet misses', 'Misses'],
    ['300s', '200s', '50s', 'Max 300s', '100s', 'Misses']
  ];

  const map = query((signal) =>
    score && open ? mirrorBeatmap(score.beatmap.beatmap_id, signal) : Promise.resolve(null)
  );

  const grade = $derived(score ? gradeOf(score) : 'D');
  const parts = $derived(score ? songParts(score.beatmap.song_name) : { song: '', diff: '' });
  const maxCombo = $derived(map.state.status === 'ready' ? map.state.data?.max_combo : undefined);
  const fullCombo = $derived(
    !!score &&
      (score.full_combo ||
        (maxCombo !== undefined && score.max_combo > 0.97 * maxCombo && score.count_misses === 0))
  );
  const hits = $derived(
    score
      ? [
          score.count_300,
          score.count_100,
          score.count_50,
          score.count_gekis,
          score.count_katus,
          score.count_misses
        ]
      : []
  );
</script>

<Dialog bind:open class="score-dialog">
  {#if score}
    <div class="detail-head" style="--cover: url({coverUrl(score.beatmap.beatmapset_id, 'cover')})">
      <div class="score-bg"></div>
      <span class="grade grade-{gradeClass[grade]}">{gradeLabel(grade)}</span>
      <div class="detail-title">
        <a class="song" href="/beatmaps/{score.beatmap.beatmap_id}">{parts.song}</a>
        <span>{parts.diff}</span>
      </div>
      <button class="dialog-close" aria-label="Close" onclick={() => (open = false)}>
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div class="detail-body">
      <div class="detail-headline">
        <b>{number(score.pp, 2)}pp</b><span>{number(score.accuracy, 2)}%</span>
      </div>
      <dl class="detail-stats">
        <div>
          <dt>Score</dt>
          <dd>{number(score.score)}</dd>
        </div>
        <div>
          <dt>Max combo</dt>
          <dd>
            {number(score.max_combo)}{maxCombo !== undefined ? `/${number(maxCombo)}` : ''}x
            {#if fullCombo}<span class="fc">FC</span>{/if}
          </dd>
        </div>
        <div>
          <dt>Difficulty</dt>
          <dd>
            <span
              class="stars"
              style="background: {starColour(score.beatmap.difficulty)}; color: {starTextColour(
                score.beatmap.difficulty
              )}"
            >
              {number(score.beatmap.difficulty, 2)}★
            </span>
          </dd>
        </div>
        <div>
          <dt>Mods</dt>
          <dd>{modsText(score.mods) || 'None'}</dd>
        </div>
      </dl>
      <ul class="detail-hits">
        {#each hits as count, i (i)}
          <li class="hit-{i}">
            <b>{number(count)}</b><span>{hitLabels[score.play_mode][i]}</span>
          </li>
        {/each}
      </ul>
      <p class="detail-meta">
        <span class="tag {score.completed >= 1 ? 'tag-pass' : 'tag-fail'}">
          {score.completed >= 1 ? 'Passed' : 'Failed'}
        </span>
        {#if score.completed === 3}<span class="tag tag-best">Personal best</span>{/if}
        <span>{modeNames[score.play_mode]} · {timeAgo(score.submitted_at)}</span>
      </p>
      {#if score.completed === 3}
        <div class="dialog-actions">
          <a class="btn btn-blue" href={replayUrl(score.id)}>
            <i class="fa-solid fa-download"></i>Download replay
          </a>
        </div>
      {/if}
    </div>
  {/if}
</Dialog>
