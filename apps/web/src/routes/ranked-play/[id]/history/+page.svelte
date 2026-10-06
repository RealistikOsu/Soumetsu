<script lang="ts">
  import { page } from '$app/state';
  import { isApiError } from '$lib/api/errors';
  import { query } from '$lib/api/query.svelte';
  import { matchEvents } from '$lib/api/rankedPlay';
  import Avatar from '$lib/components/Avatar.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import NotFound from '$lib/components/NotFound.svelte';
  import RankedMap from '$lib/components/RankedMap.svelte';
  import RankedMatchHead from '$lib/components/RankedMatchHead.svelte';
  import { clock, fromIso, number } from '$lib/format';
  import { gradeClass, gradeFromRank, gradeLabel } from '$lib/grades';
  import { m } from '$lib/paraglide/messages';

  const id = $derived(Number(page.params.id));
  const history = query((signal) => matchEvents(id, signal));
  const result = $derived(history.state);

  const notes = {
    joined: { icon: 'fa-right-to-bracket', colour: 'c-green' },
    left: { icon: 'fa-right-from-bracket', colour: 'c-orange' },
    disbanded: { icon: 'fa-ban', colour: 'c-red' },
    round_ended: { icon: 'fa-flag-checkered', colour: 'c-blue' }
  };
</script>

{#if result.status === 'error' && isApiError(result.error) && result.error.status === 404}
  <NotFound />
{:else if result.status === 'ready'}
  {@const { match, events } = result.data}
  <RankedMatchHead {match} view="history" />

  <main class="wrap rp-page">
    {#if events.length}
      <ol class="rp-timeline">
        {#each events as event, i (i)}
          {#if event.type === 'round'}
            {@const round = event.round}
            <li class="rp-event rp-round">
              <span class="rp-dot c-purple"><i class="fa-solid fa-music"></i></span>
              <div class="panel c-purple">
                <RankedMap beatmap={round.beatmap} ruleset={round.ruleset} round={round.number} />
                <div class="rp-time">
                  {clock(fromIso(round.started_at))}{#if round.ended_at}
                    – {clock(fromIso(round.ended_at))}{/if}
                </div>
                <table class="board rp-board">
                  <thead>
                    <tr>
                      <th class="rank"></th>
                      <th class="player">{m.leaderboard_col_player()}</th>
                      <th class="hide-sm">{m.ranked_combo()}</th>
                      <th>{m.leaderboard_col_accuracy()}</th>
                      <th class="hide-sm">{m.ranked_great()}</th>
                      <th class="hide-sm">{m.ranked_ok()}</th>
                      <th class="hide-sm">{m.ranked_meh()}</th>
                      <th class="hide-sm">{m.ranked_miss()}</th>
                      <th>{m.ranked_col_score()}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each round.scores as score (score.user.id)}
                      {@const grade = score.passed ? gradeFromRank(score.rank) : 'F'}
                      <tr class:is-failed={!score.passed}>
                        <td class="rank"
                          ><span class="grade grade-{gradeClass[grade]}">{gradeLabel(grade)}</span
                          ></td
                        >
                        <td class="player">
                          <a href="/users/{score.user.id}">
                            <Avatar id={score.user.id} /><Flag country={score.user.country} /><b
                              >{score.user.username}</b
                            >
                          </a>
                        </td>
                        <td class="dim hide-sm">{number(score.max_combo)}x</td>
                        <td>{number(score.accuracy, 2)}%</td>
                        <td class="dim hide-sm">{number(score.statistics.great)}</td>
                        <td class="dim hide-sm">{number(score.statistics.ok)}</td>
                        <td class="dim hide-sm">{number(score.statistics.meh)}</td>
                        <td class="dim hide-sm">{number(score.statistics.miss)}</td>
                        <td class="pp">{number(score.total_score)}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </li>
          {:else}
            {@const note = notes[event.type]}
            <li class="rp-event rp-note">
              <span class="rp-dot {note.colour}"><i class="fa-solid {note.icon}"></i></span>
              <p>
                {#if event.user}
                  <a href="/users/{event.user.id}"><Avatar id={event.user.id} /></a>
                  <a href="/users/{event.user.id}"><b>{event.user.username}</b></a>
                {/if}
                {#if event.type === 'joined'}
                  {m.ranked_joined()}
                {:else if event.type === 'left'}
                  {m.ranked_left()}
                {:else if event.type === 'disbanded'}
                  {m.ranked_disbanded()}
                {:else}
                  {m.ranked_game_ended()}
                {/if}
                <time>{clock(fromIso(event.at))}</time>
              </p>
            </li>
          {/if}
        {/each}
      </ol>
    {:else}
      <div class="panel c-purple"><p class="empty-note">{m.common_nothing_here()}</p></div>
    {/if}
  </main>
{:else if result.status === 'error'}
  <main class="wrap rp-page">
    <div class="panel c-red"><p class="empty-note">{m.common_load_failed()}</p></div>
  </main>
{:else}
  <main class="wrap rp-page">
    <div class="panel"><span class="skel" style="width: 100%; height: 220px"></span></div>
  </main>
{/if}
