<script lang="ts">
  import { goto } from '$app/navigation';
  import { api } from '$lib/api/client';
  import Avatar from './Avatar.svelte';

  interface Result {
    id: number;
    username: string;
  }

  let value = $state('');
  let results = $state.raw<Result[] | null>(null);
  let loading = $state(false);
  let active = $state(-1);
  let input: HTMLInputElement;
  let timer: ReturnType<typeof setTimeout>;
  let sequence = 0;

  function onInput() {
    clearTimeout(timer);
    const name = value.trim();
    if (!name) return close();
    timer = setTimeout(() => search(name), 200);
  }

  async function search(name: string) {
    const mine = ++sequence;
    const skeleton = setTimeout(() => (loading = true), 120);
    const found = await api
      .get<Result[]>('/users/search', { q: name, limit: 25 })
      .catch(() => [] as Result[]);
    clearTimeout(skeleton);
    if (mine !== sequence) return;
    loading = false;
    results = found;
    active = -1;
  }

  function close() {
    sequence++;
    results = null;
    loading = false;
    active = -1;
  }

  function move(step: number) {
    if (!results?.length) return;
    active = (active + step + results.length) % results.length;
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      move(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter') {
      const pick = results?.[Math.max(active, 0)];
      goto(`/users/${pick ? pick.id : encodeURIComponent(value.trim())}`);
      close();
    } else if (event.key === 'Escape') {
      close();
      input.blur();
    }
  }

  function onWindowKeydown(event: KeyboardEvent) {
    if (event.key.toLowerCase() !== 's' || event.ctrlKey || event.metaKey || event.altKey) return;
    if ((document.activeElement as Element).matches('input, textarea, select, [contenteditable]')) {
      return;
    }
    if (!input.offsetParent) return;
    event.preventDefault();
    input.focus();
  }

  function onWindowClick(event: MouseEvent) {
    if (!(event.target as Element).closest('.search-box')) close();
  }
</script>

<svelte:window onkeydown={onWindowKeydown} onclick={onWindowClick} />

<div class="search-box">
  <input
    bind:this={input}
    bind:value
    class="search"
    type="search"
    placeholder="Looking for someone?"
    aria-label="Find a player"
    autocomplete="off"
    oninput={onInput}
    onkeydown={onKeydown}
  />
  <div class="search-results" hidden={!loading && results === null}>
    {#if loading}
      {#each [0, 1, 2] as n (n)}
        <span class="skel-line skel-result" aria-hidden="true">
          <span class="skel-avatar"></span><span class="skel" style="width: 60%"></span>
        </span>
      {/each}
    {:else if results?.length === 0}
      <p>Nobody found.</p>
    {:else}
      {#each results ?? [] as user, i (user.id)}
        <a href="/users/{user.id}" class:active={i === active} onclick={close}>
          <Avatar id={user.id} /><b>{user.username}</b>
        </a>
      {/each}
    {/if}
  </div>
</div>
