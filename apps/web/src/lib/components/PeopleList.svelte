<script lang="ts">
  import { tabInk } from '@soumetsu/ui';
  import { api } from '$lib/api/client';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import { addFriend, removeFriend } from '$lib/api/users';
  import { isSupporter } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import { flash } from '$lib/flash.svelte';
  import Avatar from './Avatar.svelte';
  import Banner from './Banner.svelte';
  import Flag from './Flag.svelte';
  import Username from './Username.svelte';

  let { kind }: { kind: 'friends' | 'followers' } = $props();

  interface Person {
    user_id: number;
    username: string;
    country: string;
  }

  const relationships = query((signal) =>
    api.get<{ friends: Person[]; followers: Person[]; mutual: number[] }>(
      '/users/me/friends/relationships',
      { limit: 100 },
      signal
    )
  );

  const supporter = $derived(!!session.user && isSupporter(session.user.privileges));
  // Following someone back moves them between the lists, so the buttons change local state.
  let added = $state<Record<number, boolean>>({});

  const data = $derived(relationships.state.status === 'ready' ? relationships.state.data : null);
  const friendIds = $derived(new Set(data?.friends.map((f) => f.user_id)));
  const people = $derived.by(() => {
    if (!data) return [];
    const list =
      kind === 'friends' ? data.friends : data.followers.filter((f) => !friendIds.has(f.user_id));
    return list.toSorted((a, b) =>
      a.username.localeCompare(b.username, 'en', { sensitivity: 'base' })
    );
  });

  const isFriend = (person: Person) => added[person.user_id] ?? friendIds.has(person.user_id);
  const isMutual = (person: Person) => isFriend(person) && !!data?.mutual.includes(person.user_id);

  async function toggle(person: Person) {
    try {
      if (isFriend(person)) await removeFriend(person.user_id);
      else await addFriend(person.user_id);
      added[person.user_id] = !isFriend(person);
    } catch (error) {
      flash.show('error', describe(error));
    }
  }

  const title = $derived(kind === 'friends' ? 'Friends' : 'Followers');
</script>

<svelte:head><title>{title} · RealistikOsu</title></svelte:head>

<Banner image="friends.jpg">
  <div>
    <h1>{title}</h1>
    <p class="sub">
      {kind === 'friends'
        ? "Everyone you've added. A heart means they added you back."
        : "People who added you that you haven't added back."}
    </p>
  </div>
</Banner>

<main class="wrap friends">
  <nav class="tabs tinted friends-tabs" use:tabInk>
    <a class="c-green {kind === 'friends' ? 'active' : ''}" href="/friends">
      <i class="fa-solid fa-user-group"></i>Friends
      {#if data}<span class="count">{data.friends.length}</span>{/if}
    </a>
    <a class="c-yellow {kind === 'followers' ? 'active' : ''}" href="/followers">
      <i class="fa-solid fa-users"></i>Followers
      <span class="supporter">Supporter</span>
    </a>
  </nav>

  {#if kind === 'followers' && !supporter}
    <div class="panel c-yellow">
      <p class="empty-note">
        <i class="fa-solid fa-heart"></i> Seeing your followers is a supporter perk.
        <a href="/donate">Support RealistikOsu</a> to unlock it.
      </p>
    </div>
  {:else if relationships.state.status === 'error'}
    <div class="panel"><p class="empty-note">Couldn't load this. Try again in a bit.</p></div>
  {:else if relationships.state.status === 'loading'}
    <div class="people">
      {#each [0, 1, 2, 3, 4, 5] as n (n)}
        <div class="person">
          <span class="skel-avatar"></span><span class="skel" style="width: 120px"></span>
        </div>
      {/each}
    </div>
  {:else if people.length === 0}
    <div class="panel">
      <p class="empty-note">
        {kind === 'friends' ? "You haven't added anyone yet." : 'Nobody is following you yet.'}
      </p>
    </div>
  {:else}
    <div class="people">
      {#each people as person (person.user_id)}
        {@const friend = isFriend(person)}
        <div class="person">
          <a href="/users/{person.user_id}"><Avatar id={person.user_id} /></a>
          <div class="person-info">
            <a href="/users/{person.user_id}">
              <Flag country={person.country} /><Username
                id={person.user_id}
                name={person.username}
              />
            </a>
          </div>
          <button
            class="friend-button is-{isMutual(person) ? 'mutual' : friend ? 'friend' : 'follower'}"
            type="button"
            onclick={() => toggle(person)}
          >
            <i
              class="fa-solid {isMutual(person)
                ? 'fa-heart'
                : friend
                  ? 'fa-user-minus'
                  : 'fa-user-plus'}"
            ></i>
            <span>{isMutual(person) ? 'Mutual' : friend ? 'Remove' : 'Add'}</span>
          </button>
        </div>
      {/each}
    </div>
  {/if}
</main>
