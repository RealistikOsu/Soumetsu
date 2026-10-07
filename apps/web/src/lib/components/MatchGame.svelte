<script lang="ts">
  import type { Game } from '$lib/api/multiplayer';
  import Avatar from '$lib/components/Avatar.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import MatchMap from '$lib/components/MatchMap.svelte';
  import ModBadges from '$lib/components/ModBadges.svelte';
  import { clock, fromIso, number } from '$lib/format';
  import { gradeClass, gradeFromRank, gradeLabel } from '$lib/grades';
  import { m } from '$lib/paraglide/messages';

  let { game }: { game: Game } = $props();

  const winLabels = [
    () => m.multiplayer_win_score(),
    () => m.multiplayer_win_accuracy(),
    () => m.multiplayer_win_combo(),
    () => m.multiplayer_win_score_v2()
  ];
  const teamLabels = [
    () => m.multiplayer_team_head_to_head(),
    () => m.multiplayer_team_tag_coop(),
    () => m.multiplayer_team_vs(),
    () => m.multiplayer_team_tag_vs()
  ];

  // Mania has the extra MAX and 200 judgements, and taiko has no 50s.
  const hits = $derived(
    game.mode === 3
      ? ([
          ['MAX', 'count_geki'],
          ['300', 'count_300'],
          ['200', 'count_katu'],
          ['100', 'count_100'],
          ['50', 'count_50']
        ] as const)
      : game.mode === 1
        ? ([
            ['300', 'count_300'],
            ['100', 'count_100']
          ] as const)
        : ([
            ['300', 'count_300'],
            ['100', 'count_100'],
            ['50', 'count_50']
          ] as const)
  );
  const teams = $derived(game.team_type >= 2);
</script>

<MatchMap
  beatmap={game.beatmap}
  ruleset={game.mode}
  label={m.multiplayer_game({ number: game.number })}
>
  <ModBadges bits={game.mods} />
  <span class="rp-ruleset">{winLabels[game.win_condition]?.()}</span>
  <span class="rp-ruleset">{teamLabels[game.team_type]?.()}</span>
</MatchMap>
<div class="rp-time">
  {clock(fromIso(game.started_at))}{#if game.ended_at}
    – {clock(fromIso(game.ended_at))}{/if}
</div>
<table class="board rp-board">
  <thead>
    <tr>
      <th class="rank"></th>
      <th class="player">{m.leaderboard_col_player()}</th>
      <th class="hide-sm">{m.ranked_combo()}</th>
      <th>{m.leaderboard_col_accuracy()}</th>
      {#each hits as [label] (label)}<th class="hide-sm">{label}</th>{/each}
      <th class="hide-sm">{m.ranked_miss()}</th>
      <th>{m.ranked_col_score()}</th>
    </tr>
  </thead>
  <tbody>
    {#each game.scores as score (score.user.id)}
      {@const grade = score.passed ? gradeFromRank(score.grade) : 'F'}
      <tr class:is-failed={!score.passed}>
        <td class="rank"
          ><span class="grade grade-{gradeClass[grade]}">{gradeLabel(grade)}</span></td
        >
        <td class="player">
          <a href="/users/{score.user.id}">
            {#if teams && score.team}
              <span
                class="rp-team team-{score.team}"
                title={score.team === 1 ? m.multiplayer_team_blue() : m.multiplayer_team_red()}
              ></span>
            {/if}
            <Avatar id={score.user.id} /><Flag country={score.user.country} /><b
              >{score.user.username}</b
            >
            {#if score.mods !== game.mods}<ModBadges bits={score.mods & ~game.mods} />{/if}
          </a>
        </td>
        <td class="dim hide-sm">{number(score.max_combo)}x</td>
        <td>{number(score.accuracy, 2)}%</td>
        {#each hits as [label, key] (label)}
          <td class="dim hide-sm">{number(score.statistics[key])}</td>
        {/each}
        <td class="dim hide-sm">{number(score.statistics.count_miss)}</td>
        <td class="pp">{number(score.score)}</td>
      </tr>
    {/each}
  </tbody>
</table>
