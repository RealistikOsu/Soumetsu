<script lang="ts">
  import { fullDate, fromIso } from '$lib/format';
  import type { NewsSummary } from '$lib/news';

  let { post, featured = false }: { post: NewsSummary; featured?: boolean } = $props();
</script>

<a class="news-card panel" class:featured href="/news/{post.slug}">
  <span
    class="news-cover"
    style="background-image: url({post.cover_url ?? '/img/banner-default.png'})"
  >
    <span class="news-date">{fullDate(fromIso(post.published_at))}</span>
  </span>
  <span class="news-text">
    <b>{post.title}</b>
    <span class="news-preview">{post.preview}</span>
    {#if post.author}<small>{post.author.username}</small>{/if}
  </span>
</a>
