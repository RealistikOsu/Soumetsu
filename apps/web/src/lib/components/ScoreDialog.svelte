<script lang="ts">
  import { mirrorBeatmap } from '$lib/api/mirror';
  import { query } from '$lib/api/query.svelte';
  import { fullComboPp, type ScoreWithBeatmap } from '$lib/api/scores';
  import { coverUrl, replayUrl } from '$lib/assets';
  import { starColour, starTextColour } from '$lib/beatmaps';
  import { number, songParts, timeAgo } from '$lib/format';
  import { gradeClass, gradeLabel, gradeOf } from '$lib/grades';
  import { isLazer, modeNames } from '$lib/modes';
  import { flash } from '$lib/flash.svelte';
  import { modsText } from '$lib/mods';
  import { m } from '$lib/paraglide/messages';
  import Dialog from './Dialog.svelte';

  let {
    score,
    rx = 0,
    open = $bindable(false)
  }: {
    score: ScoreWithBeatmap | null;
    rx?: number;
    open?: boolean;
  } = $props();

  const hitLabels = [
    ['300s', '100s', '50s', 'Gekis', 'Katus', m.profile_hits_misses()],
    ['GREATs', 'GOODs', '50s', 'GREATs (Gekis)', 'GOODs (Katus)', m.profile_hits_misses()],
    [
      m.profile_hits_fruits(),
      m.profile_hits_ticks(),
      m.profile_hits_droplets(),
      'Gekis',
      m.profile_hits_droplet_misses(),
      m.profile_hits_misses()
    ],
    ['300s', '200s', '50s', 'Max 300s', '100s', m.profile_hits_misses()]
  ];

  const map = query((signal) =>
    score && open ? mirrorBeatmap(score.beatmap.beatmap_id, signal) : Promise.resolve(null)
  );

  const grade = $derived(score ? gradeOf(score) : 'D');
  // Only worth asking for a score that dropped combo or missed.
  const ifFc = query(() =>
    score && open && !isLazer(rx) && (score.count_misses > 0 || !score.full_combo)
      ? fullComboPp(score)
      : Promise.resolve(null)
  );
  const fcPp = $derived(ifFc.state.status === 'ready' ? ifFc.state.data : null);
  const parts = $derived(score ? songParts(score.beatmap.song_name) : { song: '', diff: '' });
  const maxCombo = $derived(map.state.status === 'ready' ? map.state.data?.max_combo : undefined);
  const fullCombo = $derived(
    !!score &&
      (score.full_combo ||
        (maxCombo !== undefined && score.max_combo > 0.97 * maxCombo && score.count_misses === 0))
  );
  const copyId = () =>
    navigator.clipboard.writeText(String(score?.id)).then(
      () => flash.show('success', m.profile_dialog_id_copied()),
      () => null
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
      <button
        class="dialog-close"
        aria-label={m.profile_dialog_close()}
        onclick={() => (open = false)}
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div class="detail-body">
      <div class="detail-headline">
        <b>{number(score.pp, 2)}pp</b><span>{number(score.accuracy, 2)}%</span>
        {#if fcPp !== null && fcPp > score.pp}
          <span class="if-fc">{m.profile_dialog_if_fc({ pp: number(fcPp, 2) })}</span>
        {/if}
      </div>
      <dl class="detail-stats">
        <div>
          <dt>{m.profile_dialog_score()}</dt>
          <dd>{number(score.score)}</dd>
        </div>
        <div>
          <dt>{m.profile_dialog_max_combo()}</dt>
          <dd>
            {number(score.max_combo)}{maxCombo !== undefined ? `/${number(maxCombo)}` : ''}x
            {#if fullCombo}<span class="fc">FC</span>{/if}
          </dd>
        </div>
        <div>
          <dt>{m.profile_dialog_difficulty()}</dt>
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
          <dt>{m.profile_dialog_mods()}</dt>
          <dd>{modsText(score.mods) || m.profile_dialog_no_mods()}</dd>
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
          {score.completed >= 1 ? m.profile_dialog_passed() : m.profile_dialog_failed()}
        </span>
        {#if score.completed === 3}<span class="tag tag-best"
            >{m.profile_dialog_personal_best()}</span
          >{/if}
        <span>{modeNames[score.play_mode]} · {timeAgo(score.submitted_at)}</span>
        <button class="copy-id" type="button" title={m.profile_dialog_score_id()} onclick={copyId}>
          ID {score.id}<i class="fa-solid fa-copy"></i>
        </button>
      </p>
      {#if isLazer(rx)}
        <div class="dialog-actions">
          <a class="btn btn-blue" href="/scores/{score.id}">
            <i class="fa-solid fa-up-right-from-square"></i>{m.profile_score_open_page()}
          </a>
        </div>
      {/if}
      {#if score.completed === 3 && !isLazer(rx)}
        <div class="dialog-actions">
          <a class="btn btn-blue" href={replayUrl(score.id)}>
            <i class="fa-solid fa-download"></i>{m.profile_score_download_replay()}
          </a>
        </div>
      {/if}
    </div>
  {/if}
</Dialog>
