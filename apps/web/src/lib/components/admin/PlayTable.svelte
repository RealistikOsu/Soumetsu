<script lang="ts">
  import type { DashboardPlay } from '$lib/api/admin';
  import { gradeClass, gradeLabel } from '$lib/grades';
  import { number, songParts } from '$lib/format';
  import { modsText } from '$lib/mods';
  import Avatar from '../Avatar.svelte';
  import Flag from '../Flag.svelte';
  import Username from '../Username.svelte';
  import AdminTag from './AdminTag.svelte';

  let {
    plays,
    loading = false,
    accuracy = false
  }: { plays: DashboardPlay[]; loading?: boolean; accuracy?: boolean } = $props();

  const modes = [
    ['Vanilla', 'c-yellow'],
    ['Relax', 'c-pink'],
    ['Autopilot', 'c-purple']
  ];
  const columns = $derived(accuracy ? 6 : 5);

  const when = (unix: number) =>
    new Date(unix * 1000).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
</script>

<div class="table-wrap">
  <table class="board admin-table c-purple">
    <thead>
      <tr>
        <th>When</th>
        <th class="player">Player</th>
        <th>Play</th>
        <th>Mode</th>
        {#if accuracy}<th>Accuracy</th>{/if}
        <th>PP</th>
      </tr>
    </thead>
    <tbody>
      {#if loading}
        {#each [0, 1, 2, 3, 4, 5] as n (n)}
          <tr>
            <td colspan={columns}><span class="skel" style="width: 100%; height: 22px"></span></td>
          </tr>
        {/each}
      {:else}
        {#each plays as play (`${play.custom}-${play.id}`)}
          {@const parts = songParts(play.song_name)}
          {@const text = modsText(play.mods)}
          <tr>
            <td class="dim">{when(play.time)}</td>
            <td class="player">
              <a class="who" href="/users/{play.userid}">
                <Flag country={play.country} /><Avatar id={play.userid} /><Username
                  id={play.userid}
                  name={play.username}
                />
              </a>
            </td>
            <td class="song-cell">
              <span class="grade grade-{gradeClass[play.grade]}" title={play.grade}>
                {gradeLabel(play.grade)}
              </span>
              <a href="/beatmaps/{play.beatmap_id}">{parts.song} <span>[{parts.diff}]</span></a>
              {#if text}<span class="mods">{text}</span>{/if}
            </td>
            <td><AdminTag colour={modes[play.custom][1]}>{modes[play.custom][0]}</AdminTag></td>
            {#if accuracy}<td class="dim">{play.accuracy.toFixed(2)}%</td>{/if}
            <td class="pp">{number(Math.round(play.pp))}pp</td>
          </tr>
        {:else}
          <tr><td colspan={columns} class="empty-note">No plays to show.</td></tr>
        {/each}
      {/if}
    </tbody>
  </table>
</div>
