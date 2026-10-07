<script lang="ts">
  import { query } from '$lib/api/query.svelte';
  import { challengeDays } from '$lib/api/rooms';
  import { intlLocale } from '$lib/i18n';
  import { m } from '$lib/paraglide/messages';

  let { selected, today }: { selected: string; today: string } = $props();

  const FIRST_YEAR = 2024;

  const parse = (date: string) => ({
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)) - 1
  });
  const limit = $derived(parse(today));

  // Browsing other months leaves the selected day alone; picking a day clears this again.
  let browsing = $state<{ year: number; month: number } | null>(null);
  const shown = $derived(browsing ?? parse(selected));

  const days = query((signal) => challengeDays(shown.year, shown.month + 1, signal));
  const enabled = $derived(
    days.state.status === 'ready'
      ? days.state.data.filter((day) => day.has_challenge).map((day) => day.date)
      : []
  );

  const format = (utc: number, options: Intl.DateTimeFormatOptions) =>
    new Date(utc).toLocaleDateString(intlLocale(), { ...options, timeZone: 'UTC' });
  const months = Array.from({ length: 12 }, (_, i) =>
    format(Date.UTC(2024, i, 1), { month: 'long' })
  );
  // 1 Jan 2024 is a Monday.
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    format(Date.UTC(2024, 0, 1 + i), { weekday: 'short' })
  );
  const years = $derived(
    Array.from({ length: limit.year - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i)
  );

  const lead = $derived((new Date(Date.UTC(shown.year, shown.month, 1)).getUTCDay() + 6) % 7);
  const length = $derived(new Date(Date.UTC(shown.year, shown.month + 1, 0)).getUTCDate());
  const key = (day: number) =>
    `${shown.year}-${String(shown.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const index = $derived(shown.year * 12 + shown.month);
  const canBack = (by: number) => index - by >= FIRST_YEAR * 12;
  const canForward = (by: number) => index + by <= limit.year * 12 + limit.month;

  function step(by: number) {
    const next = index + by;
    browsing = { year: Math.floor(next / 12), month: next % 12 };
  }
</script>

<div class="panel calendar">
  <div class="cal-bar">
    <button
      type="button"
      aria-label={m.rooms_prev_year()}
      disabled={!canBack(12)}
      onclick={() => step(-12)}
    >
      <i class="fa-solid fa-angles-left"></i>
    </button>
    <button
      type="button"
      aria-label={m.rooms_prev_month()}
      disabled={!canBack(1)}
      onclick={() => step(-1)}
    >
      <i class="fa-solid fa-angle-left"></i>
    </button>
    <select
      aria-label={m.rooms_month()}
      value={shown.month}
      onchange={(event) => (browsing = { ...shown, month: Number(event.currentTarget.value) })}
    >
      {#each months as name, i (i)}
        <option value={i} disabled={shown.year === limit.year && i > limit.month}>{name}</option>
      {/each}
    </select>
    <select
      aria-label={m.rooms_year()}
      value={shown.year}
      onchange={(event) => {
        const year = Number(event.currentTarget.value);
        browsing = {
          year,
          month: year === limit.year ? Math.min(shown.month, limit.month) : shown.month
        };
      }}
    >
      {#each years as year (year)}<option value={year}>{year}</option>{/each}
    </select>
    <button
      type="button"
      aria-label={m.rooms_next_month()}
      disabled={!canForward(1)}
      onclick={() => step(1)}
    >
      <i class="fa-solid fa-angle-right"></i>
    </button>
    <button
      type="button"
      aria-label={m.rooms_next_year()}
      disabled={!canForward(12)}
      onclick={() => step(12)}
    >
      <i class="fa-solid fa-angles-right"></i>
    </button>
  </div>
  <div class="cal-grid" class:is-loading={days.state.status === 'loading'}>
    {#each weekdays as name (name)}<span class="cal-head">{name}</span>{/each}
    {#each { length: lead }, i (i)}<span></span>{/each}
    {#each { length }, i (i)}
      {@const date = key(i + 1)}
      {#if enabled.includes(date)}
        <a
          class="cal-day"
          class:today={date === today}
          class:selected={date === selected}
          href="?date={date}"
          aria-current={date === selected ? 'date' : undefined}
          onclick={() => (browsing = null)}>{i + 1}</a
        >
      {:else}
        <span class="cal-day off" class:today={date === today}>{i + 1}</span>
      {/if}
    {/each}
  </div>
</div>
