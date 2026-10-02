<script lang="ts">
  import { api } from '$lib/api/client';
  import { query } from '$lib/api/query.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import Username from '$lib/components/Username.svelte';

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
    [
      2,
      'c-blue',
      'fa-code',
      'Developers',
      'Developers do all the server-side magic and the technical work behind the scenes. They have full power over the server as they run it, and have a blue name in the in-game chat.'
    ],
    [
      1018,
      'c-red',
      'fa-list-check',
      'Administrators',
      "Administrators make sure everything runs smoothly, from organising events to hunting cheaters. They're cool people ready to help you, with power over many areas like the Discord server."
    ],
    [
      1020,
      'c-green',
      'fa-envelope',
      'Community Managers',
      'Community Managers deal with bans, silences, name changes and pretty much everything to do with the community. They look after our Discord server and answer support requests there.'
    ],
    [
      30,
      'c-yellow',
      'fa-comments',
      'Chat Moderators',
      'Chat Moderators keep an eye on the chat to make sure The Law™ (the rules) is respected.'
    ],
    [
      5,
      'c-pink',
      'fa-circle-play',
      'Beatmap Appreciation Team',
      "BATs play beatmaps in the ranking queue and decide whether they're good enough to be ranked."
    ],
    [
      1017,
      'c-lblue',
      'fa-hashtag',
      'Social Media',
      "The Social Media Team handles everything to do with RealistikOsu's presence on social media."
    ],
    [
      1015,
      'c-purple',
      'fa-graduation-cap',
      'Alumni',
      'Former team members who have stepped down, but whose work helped shape RealistikOsu into what it is today.'
    ]
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

<svelte:head><title>Team · RealistikOsu</title></svelte:head>

<Banner image="team.jpg">
  <div>
    <h1>Hall of Fame</h1>
    <p class="sub">The people who keep RealistikOsu, the server and its community, running.</p>
  </div>
</Banner>

<main class="wrap team">
  {#if loaded.state.status === 'error'}
    <p class="panel empty-note">Couldn't load the team. Try again in a bit.</p>
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

    <SectionTitle colour="c-orange" icon="fa-star">Special credits</SectionTitle>
    <ul class="panel credits c-orange">
      <li>
        <b>Franc[e]sco</b> and <b>cmyui</b>, for the relax pp calculator. It's based on
        <a href="https://github.com/Francesco149/oppai-ng">oppai-ng</a> by Franc[e]sco, modified by
        cmyui for relax, and licensed under GPL v3.
        <a href="https://github.com/osuAkatsuki/akatsuki-pp">Their implementation</a> is on GitHub.
      </li>
      <li>
        <a href="https://ripple.moe"><b>Ripple</b></a>, for the solid base RealistikOsu was built
        on. Without their generous policy to
        <a href="https://github.com/osuripple">open source</a>, it's unlikely RealistikOsu would
        have been started at all.
      </li>
      <li><b>lyandrxw</b>, for designing the RealistikOsu logos.</li>
      <li>
        <a href="#supporters"><b>Everyone</b></a> who has supported RealistikOsu with a donation.
      </li>
    </ul>

    <h2 class="section-title c-pink" id="supporters">
      <i class="fa-solid fa-heart"></i>Our amazing supporters<a href="/donate"
        >Want to be here? Support us</a
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
