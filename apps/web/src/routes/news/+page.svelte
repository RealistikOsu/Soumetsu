<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { NEWS_PAGE_SIZE, newsList } from '$lib/api/news';
  import { query } from '$lib/api/query.svelte';
  import Banner from '$lib/components/Banner.svelte';
  import NewsCard from '$lib/components/NewsCard.svelte';
  import Pager from '$lib/components/Pager.svelte';
  import { m } from '$lib/paraglide/messages';

  const current = $derived(Math.max(1, parseInt(page.url.searchParams.get('p') ?? '') || 1));
  const list = query((signal) => newsList(current, signal));
</script>

<svelte:head><title>{m.news_title()} · RealistikOsu</title></svelte:head>

<Banner image="home.jpg">
  <div><h1>{m.news_title()}</h1></div>
</Banner>

<main class="wrap news-page">
  {#if list.state.status === 'ready'}
    {@const { posts, total } = list.state.data}
    {#if posts.length}
      <div class="news-grid">
        {#each posts as post (post.slug)}<NewsCard {post} />{/each}
      </div>
      <Pager
        page={current}
        hasNext={current * NEWS_PAGE_SIZE < total}
        pages={Math.max(1, Math.ceil(total / NEWS_PAGE_SIZE))}
        onpage={(p) => goto(`?p=${p}`, { keepFocus: true })}
      />
    {:else}
      <div class="panel"><p class="empty-note">{m.news_empty()}</p></div>
    {/if}
  {:else if list.state.status === 'error'}
    <div class="panel c-red"><p class="empty-note">{m.common_load_failed()}</p></div>
  {:else}
    <div class="news-grid">
      {#each [0, 1, 2, 3, 4, 5] as n (n)}
        <div class="panel"><span class="skel" style="width: 100%; height: 220px"></span></div>
      {/each}
    </div>
  {/if}
</main>
