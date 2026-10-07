<script lang="ts">
  import { env } from '$env/dynamic/public';
  import { page } from '$app/state';
  import { lazerScore } from '$lib/api/lazerScores';
  import { query } from '$lib/api/query.svelte';
  import { profile } from '$lib/api/users';
  import { coverUrl } from '$lib/assets';
  import { countryName } from '$lib/countries';
  import Avatar from '$lib/components/Avatar.svelte';
  import ClanBadge from '$lib/components/ClanBadge.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import NotFound from '$lib/components/NotFound.svelte';
  import Stars from '$lib/components/Stars.svelte';
  import Username from '$lib/components/Username.svelte';
  import { dateTime, number, timeAgo } from '$lib/format';
  import { gradeClass, gradeFromRank, gradeLabel } from '$lib/grades';
  import { hitRows } from '$lib/lazerHits';
  import { modeNames, relaxNames } from '$lib/modes';
  import { m } from '$lib/paraglide/messages';

  const id = $derived(page.params.id ?? '');
  const valid = $derived(/^\d+$/.test(id));

  const info = query((signal) =>
    valid ? lazerScore(Number(id), signal) : Promise.reject(new Error('invalid id'))
  );
  const score = $derived(info.state.status === 'ready' ? info.state.data : null);

  // The score payload has no clan, so it comes from the profile. The page doesn't need it to render.
  const owner = query(async (signal) => {
    if (!score) return null;
    return profile(score.player.id, score.play_mode, 3 + score.variant, signal).catch(() => null);
  });
  const clan = $derived(owner.state.status === 'ready' ? (owner.state.data?.clan ?? null) : null);

  const lazerUrl = (env.PUBLIC_LAZER_URL ?? '').replace(/\/$/, '');
  const grade = $derived(score ? gradeFromRank(score.rank) : 'F');
  const hits = $derived(score ? hitRows(score) : []);
  const variant = $derived(score ? relaxNames[3 + score.variant] : '');
  const mods = $derived(
    (score?.mods ?? [])
      .filter((mod) => mod.acronym !== 'CL')
      .map((mod) => ({
        acronym: mod.acronym,
        rate: mod.settings?.speed_change ? `${mod.settings.speed_change}x` : ''
      }))
  );
  const title = $derived(
    score
      ? m.scores_title({ title: score.beatmap.title, artist: score.beatmap.artist })
      : m.scores_title_fallback()
  );
</script>

<svelte:head>
  <title
    >{score ? `${score.player.username} | ${title}` : m.scores_title_fallback()} · RealistikOsu</title
  >
</svelte:head>

{#if info.state.status === 'error'}
  <NotFound />
{:else}
  <main class="wrap sp">
    {#if score}
      <header class="sp-head">
        <h1><a href="/beatmaps/{score.beatmap.beatmap_id}">{title}</a></h1>
        <p class="sp-map">
          <img src="/img/modes/mode-{score.play_mode}.png" alt={modeNames[score.play_mode]} />
          <Stars value={score.beatmap.stars} />
          <span>
            <a href="/beatmaps/{score.beatmap.beatmap_id}">[{score.beatmap.version}]</a>
            {m.beatmaps_mapped_by()}
            <b>{score.beatmap.creator}</b>
          </span>
        </p>
      </header>

      <section
        class="sp-hero"
        style="--cover: url({coverUrl(score.beatmap.beatmapset_id, 'cover')})"
      >
        <span class="grade grade-{gradeClass[grade]} sp-grade">{gradeLabel(grade)}</span>
        <div class="sp-main">
          {#if mods.length}
            <div class="sp-mods">
              {#each mods as mod (mod.acronym)}
                <span class="sp-mod"
                  >{mod.acronym}{#if mod.rate}<small>{mod.rate}</small>{/if}</span
                >
              {/each}
            </div>
          {/if}
          <b class="sp-score">{number(score.score)}</b>
          <dl class="sp-facts">
            <div>
              <dt>{m.scores_played_by()}</dt>
              <dd>
                <a href="/users/{score.player.id}"
                  ><Username id={score.player.id} name={score.player.username} /></a
                >
              </dd>
            </div>
            <div><dd>{m.scores_submitted_on({ date: dateTime(score.submitted_at) })}</dd></div>
            <div><dd>{m.scores_played_on({ name: variant })}</dd></div>
          </dl>
          {#if score.global_rank !== null}
            <span class="sp-rank">{m.scores_global_rank({ rank: number(score.global_rank) })}</span>
          {/if}
        </div>
        {#if score.has_replay && lazerUrl}
          <a class="btn btn-blue sp-replay" href="{lazerUrl}/api/v2/scores/{score.id}/download">
            <i class="fa-solid fa-download"></i>{m.scores_download_replay()}
          </a>
        {/if}
      </section>

      <div class="sp-body">
        <aside class="sp-player">
          <Avatar id={score.player.id} class="sp-avatar" />
          <div>
            <a class="sp-name" href="/users/{score.player.id}">
              {#if clan}<span class="clan">[{clan.tag}]</span>{/if}
              <Username id={score.player.id} name={score.player.username} />
            </a>
            <span class="sp-country"
              ><Flag country={score.player.country} />{countryName(score.player.country)}
              {#if clan}<ClanBadge id={clan.id} tag={clan.tag} size="small" />{/if}</span
            >
            <span class="status" class:on={score.player.is_online}>
              {score.player.is_online
                ? m.profile_head_online()
                : m.common_card_last_seen({ time: timeAgo(score.player.last_active) })}
            </span>
          </div>
        </aside>

        <div class="sp-stats">
          <dl class="sp-key">
            <div>
              <dt>{m.scores_accuracy()}</dt>
              <dd>{number(score.accuracy, 2)}%</dd>
            </div>
            <div>
              <dt>{m.scores_max_combo()}</dt>
              <dd>{number(score.max_combo)}x</dd>
            </div>
            <div>
              <dt>{m.scores_pp()}</dt>
              <dd>{number(score.pp, 2)}</dd>
            </div>
          </dl>
          <ul class="sp-hits">
            {#each hits as hit (hit.key)}
              <li style="--hit: {hit.colour}">
                <span>{hit.label}</span>
                <b>{number(hit.value)}{hit.max !== null ? `/${number(hit.max)}` : ''}</b>
              </li>
            {/each}
          </ul>
        </div>
      </div>
    {/if}
  </main>
{/if}
