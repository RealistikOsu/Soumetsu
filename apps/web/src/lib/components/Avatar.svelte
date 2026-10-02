<script lang="ts">
  import { avatarUrl, defaultAvatar } from '$lib/assets';

  let {
    id,
    class: className = ''
  }: {
    id: number;
    class?: string;
  } = $props();

  let failedId = $state<number | null>(null);
</script>

<img
  class="avatar {className}"
  src={failedId === id ? defaultAvatar : avatarUrl(id)}
  alt=""
  loading="lazy"
  onerror={() => (failedId = id)}
/>
