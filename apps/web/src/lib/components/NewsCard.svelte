<script lang="ts">
  import { fullDate, fromIso } from '$lib/format';
  import type { NewsSummary } from '$lib/news';

  let { post }: { post: NewsSummary } = $props();
</script>

<a class="news-card panel" href="/news/{post.slug}">
  <span
    class="news-cover"
    style="background-image: url({post.cover_url ?? '/img/banner-default.png'})"
  ></span>
  <span class="news-text">
    <b>{post.title}</b>
    <span class="news-preview">{post.preview}</span>
    <small>
      {fullDate(fromIso(post.published_at))}{#if post.author}
        · {post.author.username}{/if}
    </small>
  </span>
</a>
