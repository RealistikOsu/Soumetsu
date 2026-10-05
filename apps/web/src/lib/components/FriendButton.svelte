<script lang="ts">
  import { describe } from '$lib/api/messages';
  import { addFriend, followers, isFriend, removeFriend } from '$lib/api/users';
  import { session } from '$lib/auth/session.svelte';
  import { flash } from '$lib/flash.svelte';
  import { m } from '$lib/paraglide/messages';

  let { id }: { id: number } = $props();

  let relation = $state<'none' | 'friend' | 'mutual' | null>(null);
  let count = $state<number | null>(null);
  let busy = $state(false);

  const enabled = $derived(!!session.user && session.user.id !== id);
  const label = $derived(
    relation === 'mutual'
      ? `${m.common_people_mutual()} · ${m.common_friend_remove()}`
      : relation === 'friend'
        ? `${m.common_friend_is_friend()} · ${m.common_friend_remove()}`
        : m.common_friend_add()
  );

  $effect(() => {
    followers(id).then(
      (result) => (count = result.follower_count),
      () => (count = null)
    );
    relation = null;
    if (enabled) load();
  });

  async function load() {
    const result = await isFriend(id).catch(() => null);
    relation = !result ? null : result.mutual ? 'mutual' : result.is_friend ? 'friend' : 'none';
  }

  async function toggle() {
    if (relation === null || busy) return;
    busy = true;
    try {
      const adding = relation === 'none';
      if (adding) await addFriend(id);
      else await removeFriend(id);
      if (count !== null) count += adding ? 1 : -1;
      await load();
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

<button
  class="btn btn-blue friend"
  class:is-friend={relation === 'friend'}
  class:is-mutual={relation === 'mutual'}
  type="button"
  title={label}
  aria-label={label}
  disabled={!enabled || relation === null}
  onclick={toggle}
>
  {#if relation === 'friend' || relation === 'mutual'}
    <i class="fa-solid friend-state {relation === 'mutual' ? 'fa-heart' : 'fa-user-check'}"></i>
    <i class="fa-solid fa-user-minus friend-remove"></i>
  {:else}
    <i class="fa-solid fa-user-plus"></i>
  {/if}
  {#if count !== null}<span class="friend-count">{count}</span>{/if}
</button>
