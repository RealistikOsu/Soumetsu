<script lang="ts">
  import { CountUp } from '@soumetsu/ui';
  import { dashboard, serviceStatus } from '$lib/api/admin';
  import { query } from '$lib/api/query.svelte';
  import { onlineHistory } from '$lib/api/v1';
  import { session } from '$lib/auth/session.svelte';
  import AdminHead from '$lib/components/admin/AdminHead.svelte';
  import AdminTag from '$lib/components/admin/AdminTag.svelte';
  import Sparkline from '$lib/components/admin/Sparkline.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import Username from '$lib/components/Username.svelte';
  import { number, songParts, timeAgo } from '$lib/format';
  import { modsText } from '$lib/mods';

  const data = query((signal) => dashboard(signal));
  const status = query((signal) => serviceStatus(signal));
  const history = query((signal) => onlineHistory(signal));

  const services = $derived<[string, boolean | null][]>([
    ['Score service', status.state.status === 'ready' ? status.state.data.scores : null],
    ['Bancho', status.state.status === 'ready' ? status.state.data.bancho : null],
    ['API', status.state.status === 'ready' ? status.state.data.api : null]
  ]);

  const counters = [
    ['c-blue', 'fa-users', 'registered', 'Registered users'],
    ['c-teal', 'fa-play', 'plays', 'Total plays'],
    ['c-purple', 'fa-file-lines', 'scores', 'Submitted scores'],
    ['c-yellow', 'fa-trophy', 'totalPp', 'Total pp']
  ] as const;

  const modeTags = [
    ['Vanilla', 'c-yellow'],
    ['Relax', 'c-pink'],
    ['Autopilot', 'c-purple']
  ];

  const when = (unix: number) =>
    new Date(unix * 1000).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
</script>

<AdminHead
  heading="Dashboard"
  text="Welcome back, {session.user?.username}. Here's what needs a look."
>
  {#snippet extra()}
    <div class="services">
      {#each services as [name, up] (name)}
        <span class="service" class:down={up === false} class:up>
          <i class="fa-solid fa-circle"></i>{name}
        </span>
      {/each}
    </div>
  {/snippet}
</AdminHead>

<div class="dash-top">
  <section class="panel online-card c-green">
    {#if history.state.status === 'ready' && history.state.data.length > 1}
      {@const values = history.state.data}
      <div class="online-now">
        <b><CountUp value={values[values.length - 1]} /></b>
        <span>players online</span>
      </div>
      <span class="faint">Peak of {Math.max(...values)} in the last 35 hours</span>
      <Sparkline {values} spanMinutes={2100} />
    {:else if history.state.status === 'error'}
      <p class="empty-note">Couldn't load the player count.</p>
    {:else}
      <span class="skel" style="width: 100%; height: 90px"></span>
    {/if}
  </section>
  <div class="counters admin-counters">
    {#each counters as [colour, icon, key, label] (key)}
      <div class={colour}>
        <i class="fa-solid {icon}"></i>
        <b>
          {#if data.state.status === 'ready'}
            <CountUp value={data.state.data.counters[key]} />
          {:else}
            <span class="skel" style="width: 70px"></span>
          {/if}
        </b>
        {label}
      </div>
    {/each}
  </div>
</div>

{#if data.state.status === 'error'}
  <p class="panel empty-note">Couldn't load the dashboard. Try again in a bit.</p>
{:else}
  <div class="admin-grid stacked">
    <div>
      <SectionTitle colour="c-orange" icon="fa-bell">Needs a look</SectionTitle>
      <div class="attention">
        {#if data.state.status === 'ready'}
          {@const d = data.state.data}
          <a class="panel c-pink" href="/admin/requests">
            <i class="fa-solid fa-paper-plane"></i>
            <b
              >{d.pendingRequests.total} rank {d.pendingRequests.total === 1
                ? 'request'
                : 'requests'}</b
            >
            <span>
              {d.pendingRequests.oldest
                ? `Oldest sent ${timeAgo(d.pendingRequests.oldest)}`
                : 'The queue is empty'}
            </span>
            <em>Review queue<i class="fa-solid fa-arrow-right"></i></em>
          </a>
          <a class="panel c-lblue" href="/admin/users">
            <i class="fa-solid fa-snowflake"></i>
            <b>{d.frozen.total} frozen {d.frozen.total === 1 ? 'player' : 'players'}</b>
            <span>
              {d.frozen.soonest
                ? `${d.frozen.soonest.username} was frozen first`
                : 'Nobody is frozen'}
            </span>
            <em>See who<i class="fa-solid fa-arrow-right"></i></em>
          </a>
          <a class="panel c-red" href="/admin/ban-logs">
            <i class="fa-solid fa-user-xmark"></i>
            <b>
              {d.restrictions.week}
              {d.restrictions.week === 1 ? 'restriction' : 'restrictions'} this week
            </b>
            <span>
              {d.restrictions.latest
                ? `Latest: ${d.restrictions.latest.username}, ${timeAgo(d.restrictions.latest.ts)}`
                : 'None yet'}
            </span>
            <em>Ban logs<i class="fa-solid fa-arrow-right"></i></em>
          </a>
        {:else}
          {#each [0, 1, 2] as n (n)}
            <div class="panel"><span class="skel" style="width: 100%; height: 80px"></span></div>
          {/each}
        {/if}
      </div>

      <SectionTitle colour="c-purple" icon="fa-clock-rotate-left">Latest plays</SectionTitle>
      <div class="table-wrap">
        <table class="board admin-table c-purple">
          <thead>
            <tr>
              <th>When</th>
              <th class="player">Player</th>
              <th>Play</th>
              <th>Mode</th>
              <th>PP</th>
            </tr>
          </thead>
          <tbody>
            {#if data.state.status === 'ready'}
              {#each data.state.data.latest as play (`${play.custom}-${play.id}`)}
                {@const parts = songParts(play.song_name)}
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
                    <a href="/beatmaps/{play.beatmap_id}"
                      >{parts.song} <span>[{parts.diff}]</span></a
                    >
                    {#if modsText(play.mods)}<span class="mods">{modsText(play.mods)}</span>{/if}
                  </td>
                  <td
                    ><AdminTag colour={modeTags[play.custom][1]}
                      >{modeTags[play.custom][0]}</AdminTag
                    ></td
                  >
                  <td class="pp">{number(Math.round(play.pp))}pp</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>

    <aside>
      <h2 class="section-title c-blue">
        <i class="fa-solid fa-list-check"></i>Staff activity<a href="/admin/logs">All logs</a>
      </h2>
      <ol class="panel feed c-blue">
        {#if data.state.status === 'ready'}
          {#each data.state.data.activity as entry (entry.id)}
            <li>
              <Avatar id={entry.userid} />
              <p><b>{entry.username ?? entry.userid}</b> {entry.text}</p>
              <time>{timeAgo(entry.datetime)}</time>
            </li>
          {/each}
        {/if}
      </ol>
    </aside>
  </div>
{/if}
