<script lang="ts">
  import { page } from '$app/state';
  import { isApiError } from '$lib/api/errors';
  import { newsPost } from '$lib/api/news';
  import { query } from '$lib/api/query.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import NotFound from '$lib/components/NotFound.svelte';
  import { renderDoc } from '$lib/docs/render';
  import { dateTime, fromIso } from '$lib/format';
  import { m } from '$lib/paraglide/messages';

  const slug = $derived(page.params.slug ?? '');
  const post = query((signal) => newsPost(slug, signal));
  const result = $derived(post.state);
  const html = $derived(result.status === 'ready' ? renderDoc(result.data.body).html : '');
</script>

<svelte:head>
  <title>{result.status === 'ready' ? result.data.title : m.news_title()} · RealistikOsu</title>
</svelte:head>

{#if result.status === 'error' && isApiError(result.error) && result.error.status === 404}
  <NotFound />
{:else if result.status === 'ready'}
  {@const article = result.data}
  <Banner url={article.cover_url ?? '/img/banner-default.png'}>
    <div>
      <h1>{article.title}</h1>
      <p class="sub">
        {dateTime(fromIso(article.published_at))}{#if article.author}
          · <a href="/users/{article.author.id}">{article.author.username}</a>{/if}
      </p>
    </div>
  </Banner>
  <main class="wrap news-article">
    <a class="news-back" href="/news"><i class="fa-solid fa-arrow-left"></i>{m.news_all()}</a>
    <article class="panel doc-body">{@html html}</article>
  </main>
{:else if result.status === 'error'}
  <main class="wrap">
    <div class="panel c-red"><p class="empty-note">{m.common_load_failed()}</p></div>
  </main>
{/if}
