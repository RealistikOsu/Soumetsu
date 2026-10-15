<script lang="ts">
  import type { Snippet } from 'svelte';
  import { isApiError } from '$lib/api/errors';
  import { query } from '$lib/api/query.svelte';
  import { userExtras } from '$lib/api/site';
  import { profile } from '$lib/api/users';
  import { session } from '$lib/auth/session.svelte';
  import { setProfile } from '$lib/profile';
  import NotFound from './NotFound.svelte';
  import ProfileHead from './ProfileHead.svelte';

  let { id, children }: { id: number; children: Snippet } = $props();

  const extras = query((signal) => userExtras(id, signal));
  // Name, country and the rest of the head are the same in every mode.
  const owner = query((signal) => profile(id, 0, 0, signal));

  const extra = $derived(extras.state.status === 'ready' ? extras.state.data : null);
  const base = $derived(owner.state.status === 'ready' ? owner.state.data : null);
  const hidden = $derived(
    extra?.visibility === 'hidden' ||
      (extras.state.status === 'error' && isApiError(extras.state.error)) ||
      (owner.state.status === 'error' &&
        isApiError(owner.state.error) &&
        owner.state.error.status >= 400 &&
        owner.state.error.status < 500)
  );

  setProfile({
    get id() {
      return id;
    },
    get extra() {
      return extra;
    },
    get base() {
      return base;
    },
    get own() {
      return session.user?.id === id;
    }
  });
</script>

{#if hidden}
  <NotFound user />
{:else}
  <ProfileHead />
  {@render children()}
{/if}
