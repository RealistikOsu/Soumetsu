<script lang="ts">
  import { page } from '$app/state';
  import { isApiError } from '$lib/api/errors';
  import { newsArchive, newsPost } from '$lib/api/news';
  import { query } from '$lib/api/query.svelte';
  import AlertStack from '$lib/components/AlertStack.svelte';
  import NewsArchive from '$lib/components/NewsArchive.svelte';
  import NotFound from '$lib/components/NotFound.svelte';
  import { renderDoc } from '$lib/docs/render';
  import { fullDate, fromIso } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  const slug = $derived(page.params.slug ?? '');
  const post = query((signal) => newsPost(slug, signal));
  const archive = query((signal) => newsArchive(signal));
  const result = $derived(post.state);
  const html = $derived(result.status === 'ready' ? renderDoc(result.data.body).html : '');

  // The archive is newest first, so the newer post sits just before this one.
  const entries = $derived(archive.state.status === 'ready' ? archive.state.data : []);
  const index = $derived(entries.findIndex((entry) => entry.slug === slug));
  const newer = $derived(index > 0 ? entries[index - 1] : null);
  const older = $derived(index >= 0 ? (entries[index + 1] ?? null) : null);
</script>

<svelte:head>
  <title>{result.status === 'ready' ? result.data.title : m.news_title()} · RealistikOsu</title>
</svelte:head>

{#if result.status === 'error' && isApiError(result.error) && result.error.status === 404}
  <NotFound />
{:else}
  <AlertStack />
  <main class="wrap news-layout">
    {#if result.status === 'ready'}
      {@const article = result.data}
      <article class="news-article">
        <div class="news-hero" class:bare={!article.cover_url}>
          {#if article.cover_url}<img src={article.cover_url} alt="" />{/if}
          <span class="news-date">{fullDate(fromIso(article.published_at))}</span>
        </div>
        <h1>{article.title}</h1>
        {#if article.author}
          <p class="news-byline">
            {m.news_by()} <a href="/users/{article.author.id}">{article.author.username}</a>
          </p>
        {/if}
        <div class="doc-body news-body">{@html html}</div>
        {#if newer || older}
          <nav class="news-pager">
            {#if newer}
              <a class="newer" href="/news/{newer.slug}">
                <small><i class="fa-solid fa-arrow-left"></i>{m.news_newer()}</small>
                {newer.title}
              </a>
            {/if}
            {#if older}
              <a class="older" href="/news/{older.slug}">
                <small>{m.news_older()}<i class="fa-solid fa-arrow-right"></i></small>
                {older.title}
              </a>
            {/if}
          </nav>
        {/if}
      </article>
    {:else if result.status === 'error'}
      <div class="panel c-red"><p class="empty-note">{m.common_load_failed()}</p></div>
    {:else}
      <div class="news-article">
        <span class="skel" style="width: 100%; height: 300px"></span>
        <span class="skel" style="width: 60%; height: 32px; margin-top: 16px"></span>
      </div>
    {/if}
    <NewsArchive {entries} current={slug} />
  </main>
{/if}
