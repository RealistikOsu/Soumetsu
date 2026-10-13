<script lang="ts">
  import { monthYear } from '$lib/format';
  import type { NewsArchiveEntry } from '$lib/news';
  import { m } from '$lib/paraglide/messages';

  let { entries, current = null }: { entries: NewsArchiveEntry[]; current?: string | null } =
    $props();

  // published_at is ISO, so its first characters are the UTC year and month.
  const yearOf = (entry: NewsArchiveEntry) => Number(entry.published_at.slice(0, 4));
  const monthOf = (entry: NewsArchiveEntry) => entry.published_at.slice(0, 7);

  const years = $derived(
    entries.map(yearOf).filter((year, index, all) => all.indexOf(year) === index)
  );
  const currentEntry = $derived(entries.find((entry) => entry.slug === current));

  let picked = $state<number | null>(null);
  const year = $derived(picked ?? (currentEntry ? yearOf(currentEntry) : years[0]));

  const months = $derived.by(() => {
    const groups: { key: string; label: string; posts: NewsArchiveEntry[] }[] = [];
    for (const entry of entries.filter((e) => yearOf(e) === year)) {
      const key = monthOf(entry);
      let group = groups.find((g) => g.key === key);
      if (!group) {
        const [y, mo] = key.split('-').map(Number);
        group = { key, label: monthYear(Date.UTC(y, mo - 1, 15) / 1000), posts: [] };
        groups.push(group);
      }
      group.posts.push(entry);
    }
    return groups;
  });
  const openMonth = $derived(currentEntry ? monthOf(currentEntry) : months[0]?.key);
</script>

{#if entries.length}
  <details class="news-archive panel" open>
    <summary>{m.news_archive()}</summary>
    <div class="news-years">
      {#each years as y (y)}
        <button type="button" class:active={y === year} onclick={() => (picked = y)}>{y}</button>
      {/each}
    </div>
    {#each months as month (month.key)}
      <details class="news-month" open={month.key === openMonth}>
        <summary>{month.label}</summary>
        <ul>
          {#each month.posts as post (post.slug)}
            <li>
              <a href="/news/{post.slug}" class:active={post.slug === current}>{post.title}</a>
            </li>
          {/each}
        </ul>
      </details>
    {/each}
  </details>
{/if}
