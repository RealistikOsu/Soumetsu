<script lang="ts">
  import { describe } from '$lib/api/messages';
  import { addFriend, followers, isFriend, removeFriend } from '$lib/api/users';
  import { session } from '$lib/auth/session.svelte';
  import { flash } from '$lib/flash.svelte';

  let { id }: { id: number } = $props();

  let friend = $state<boolean | null>(null);
  let count = $state<number | null>(null);
  let busy = $state(false);

  const enabled = $derived(!!session.user && session.user.id !== id);

  $effect(() => {
    followers(id).then(
      (result) => (count = result.follower_count),
      () => (count = null)
    );
    friend = null;
    if (enabled)
      isFriend(id).then(
        (r) => (friend = r.is_friend),
        () => (friend = null)
      );
  });

  async function toggle() {
    if (friend === null || busy) return;
    busy = true;
    try {
      if (friend) await removeFriend(id);
      else await addFriend(id);
      friend = !friend;
      if (count !== null) count += friend ? 1 : -1;
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

<div class="head-actions">
  <button
    class="btn btn-blue friend"
    type="button"
    disabled={!enabled || friend === null}
    onclick={toggle}
  >
    <i class="fa-solid {friend ? 'fa-user-minus' : 'fa-user-plus'}"></i>
    {friend ? 'Remove friend' : 'Add friend'}
    {#if count !== null}
      <span title="Followers"><i class="fa-solid fa-users"></i>{count}</span>
    {/if}
  </button>
</div>
