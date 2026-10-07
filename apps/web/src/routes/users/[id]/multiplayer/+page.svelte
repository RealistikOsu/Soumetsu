<script lang="ts">
  import { userMatches } from '$lib/api/multiplayer';
  import UserMatchList from '$lib/components/UserMatchList.svelte';
  import { m } from '$lib/paraglide/messages';
</script>

<UserMatchList
  title={m.multiplayer_title()}
  load={userMatches}
  href={(id) => `/multiplayer/${id}`}
  activeEmpty={m.multiplayer_active_empty()}
  endedEmpty={m.multiplayer_ended_empty()}
/>
