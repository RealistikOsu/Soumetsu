<script lang="ts">
  import { userMatches } from '$lib/api/rankedPlay';
  import UserMatchList from '$lib/components/UserMatchList.svelte';
  import { m } from '$lib/paraglide/messages';
</script>

<UserMatchList
  title={m.ranked_title()}
  load={userMatches}
  href={(id) => `/ranked-play/${id}`}
  activeEmpty={m.ranked_active_empty()}
  endedEmpty={m.ranked_ended_empty()}
/>
