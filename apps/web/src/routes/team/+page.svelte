<script lang="ts">
  import { api } from '$lib/api/client';
  import { query } from '$lib/api/query.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import Username from '$lib/components/Username.svelte';
  import { m } from '$lib/paraglide/messages';

  interface Member {
    id: number;
    username: string;
    country: string;
  }

  interface Group {
    badge_id: number;
    name: string;
    members: Member[];
  }

  // How each badge's group is described, in the order they show.
  const teams: [number, string, string, string, string][] = [
    [2, 'c-blue', 'fa-code', m.support_team_developers(), m.support_team_developers_text()],
    [1018, 'c-red', 'fa-list-check', m.support_team_admins(), m.support_team_admins_text()],
    [1020, 'c-green', 'fa-envelope', m.support_team_community(), m.support_team_community_text()],
    [30, 'c-yellow', 'fa-comments', m.support_team_chat_mods(), m.support_team_chat_mods_text()],
    [5, 'c-pink', 'fa-circle-play', 'Beatmap Appreciation Team', m.support_team_bat_text()],
    [1017, 'c-lblue', 'fa-hashtag', m.support_team_social(), m.support_team_social_text()],
    [1015, 'c-purple', 'fa-graduation-cap', m.support_team_alumni(), m.support_team_alumni_text()]
  ];

  const ALUMNI = 1015;
  const SUPPORTERS = 1002;

  const loaded = query(async (signal) => {
    const [team, alumni] = await Promise.all([
      api.get<{ groups: (Group & { members: (Member & { id: number })[] })[] }>(
        '/team/',
        undefined,
        signal
      ),
      // The team endpoint leaves the alumni out, so they come from their badge.
      api
        .get<{ user_id: number; username: string; country: string }[]>(
          `/badges/${ALUMNI}/members`,
          { limit: 100 },
          signal
        )
        .catch(() => [])
    ]);
    const groups: Record<number, Member[]> = Object.fromEntries(
      team.groups.map((g) => [g.badge_id, g.members])
    );
    groups[ALUMNI] = alumni.map((m) => ({
      id: m.user_id,
      username: m.username,
      country: m.country
    }));
    return groups;
  });

  const groups = $derived(loaded.state.status === 'ready' ? loaded.state.data : null);
</script>

<svelte:head><title>{m.support_team_title()} · RealistikOsu</title></svelte:head>

<Banner image="team.jpg">
  <div>
    <h1>{m.support_team_heading()}</h1>
    <p class="sub">{m.support_team_sub()}</p>
  </div>
</Banner>

<main class="wrap team">
  {#if loaded.state.status === 'error'}
    <p class="panel empty-note">{m.support_team_error()}</p>
  {:else if !groups}
    <div class="panel"><span class="skel" style="width: 100%; height: 280px"></span></div>
  {:else}
    {#each teams as [badge, colour, icon, name, text] (badge)}
      {@const members = groups[badge] ?? []}
      {#if members.length}
        <section class="team-group {colour}">
          <div class="team-about">
            <h2><i class="fa-solid {icon}"></i>{name}</h2>
            <p>{text}</p>
          </div>
          <div class="staff-list" class:small={badge === ALUMNI}>
            {#each members as member (member.id)}
              <a class="staff-card" href="/users/{member.id}">
                <Avatar id={member.id} />
                <span class="staff-name">
                  <Flag country={member.country} /><Username
                    id={member.id}
                    name={member.username}
                  />
                </span>
              </a>
            {/each}
          </div>
        </section>
      {/if}
    {/each}

    <SectionTitle colour="c-orange" icon="fa-star">{m.support_team_credits_title()}</SectionTitle>
    <ul class="panel credits c-orange">
      <li>
        <b>Akatsuki</b>{m.support_team_credits_akatsuki_for()}
        <a href="https://github.com/osuAkatsuki/akatsuki-pp-rs">akatsuki-pp-rs</a
        >{m.support_team_credits_akatsuki_after()}
      </li>
      <li>
        <a href="https://ripple.moe"><b>Ripple</b></a>{m.support_team_credits_ripple()}
        <a href="https://github.com/osuripple">{m.support_team_credits_ripple_link()}</a
        >{m.support_team_credits_ripple_after()}
      </li>
      <li><b>lyandrxw</b>{m.support_team_credits_logo()}</li>
      <li>
        <a href="#supporters"><b>{m.support_team_credits_everyone()}</b></a>
        {m.support_team_credits_everyone_after()}
      </li>
    </ul>

    <h2 class="section-title c-pink" id="supporters">
      <i class="fa-solid fa-heart"></i>{m.support_team_supporters()}<a href="/donate"
        >{m.support_team_supporters_link()}</a
      >
    </h2>
    <div class="supporter-chips">
      {#each groups[SUPPORTERS] ?? [] as member (member.id)}
        <a class="supporter-chip" href="/users/{member.id}">
          <Avatar id={member.id} /><Username id={member.id} name={member.username} />
        </a>
      {/each}
    </div>
  {/if}
</main>
