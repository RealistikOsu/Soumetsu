<script lang="ts">
  import { scale } from 'svelte/transition';
  import { card as loadCard, cardExtras, type Card, type CardExtras } from '$lib/api/cards';
  import { describe } from '$lib/api/messages';
  import { addFriend, isFriend, removeFriend } from '$lib/api/users';
  import { avatarUrl, defaultAvatar } from '$lib/assets';
  import { session } from '$lib/auth/session.svelte';
  import { decorationClass } from '$lib/decorations';
  import { flash } from '$lib/flash.svelte';
  import { timeAgo } from '$lib/format';
  import { ms } from '$lib/motion';
  import Avatar from './Avatar.svelte';
  import Flag from './Flag.svelte';

  // Hovering a link to someone's profile shows their card, like the redesign's.
  const SHOW_DELAY = 350;
  const HIDE_DELAY = 180;
  const groupColours: Record<string, string> = {
    Developer: 'c-blue',
    Administrator: 'c-red',
    'Community Manager': 'c-green',
    'Chat Moderator': 'c-yellow',
    BAT: 'c-pink',
    Supporter: 'c-purple'
  };

  interface Loaded {
    card: Card;
    extras: CardExtras | null;
  }

  const loaded: Record<number, Loaded | null> = {};
  let current = $state<{ id: number; data: Loaded } | null>(null);
  let friend = $state<boolean | null>(null);
  let position = $state({ left: 0, top: 0, below: true });
  let element = $state<HTMLElement>();
  let showTimer: ReturnType<typeof setTimeout>;
  let hideTimer: ReturnType<typeof setTimeout>;

  const idOf = (link: Element) => link.getAttribute('href')?.match(/^\/users\/(\d+)$/)?.[1];

  function linkOf(target: EventTarget | null) {
    const link = (target as Element | null)?.closest?.('a[href^="/users/"]');
    if (!link || link.closest('.me-menu, .profile-head, .user-card')) return null;
    return idOf(link) ? link : null;
  }

  async function fetchUser(id: number) {
    if (id in loaded) return loaded[id];
    const [found, extras] = await Promise.allSettled([loadCard(id), cardExtras(id)]);
    loaded[id] =
      found.status === 'fulfilled'
        ? { card: found.value, extras: extras.status === 'fulfilled' ? extras.value : null }
        : null;
    return loaded[id];
  }

  async function show(link: Element) {
    const id = Number(idOf(link));
    const data = await fetchUser(id);
    if (!data || !link.matches(':hover')) return;
    friend = null;
    current = { id, data };
    if (session.user && session.user.id !== id) {
      isFriend(id).then(
        (result) => {
          if (current?.id === id) friend = result.is_friend;
        },
        () => null
      );
    }
    requestAnimationFrame(() => {
      if (!element) return;
      const box = link.getBoundingClientRect();
      const below = box.bottom + 8 + element.offsetHeight < innerHeight;
      position = {
        left: Math.min(Math.max(box.left, 8), innerWidth - element.offsetWidth - 8),
        top: below ? box.bottom + 8 : box.top - element.offsetHeight - 8,
        below
      };
    });
  }

  function hideSoon() {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => (current = null), HIDE_DELAY);
  }

  function onOver(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    if (element?.contains(event.target as Node)) return clearTimeout(hideTimer);
    const link = linkOf(event.target);
    if (!link) return;
    clearTimeout(hideTimer);
    clearTimeout(showTimer);
    showTimer = setTimeout(() => show(link), SHOW_DELAY);
  }

  function onOut(event: PointerEvent) {
    if (event.pointerType !== 'mouse') return;
    const leaving =
      linkOf(event.target) ?? (element?.contains(event.target as Node) ? element : null);
    const into = event.relatedTarget as Node | null;
    if (leaving && !leaving.contains(into) && !element?.contains(into)) hideSoon();
  }

  async function toggleFriend() {
    if (!current || friend === null) return;
    try {
      if (friend) await removeFriend(current.id);
      else await addFriend(current.id);
      friend = !friend;
    } catch (error) {
      flash.show('error', describe(error));
    }
  }

  const rank = (value: number) => (value ? `#${value.toLocaleString('en')}` : '-');
</script>

<svelte:window
  onpointerover={onOver}
  onpointerout={onOut}
  onscrollcapture={() => (current = null)}
/>

{#if current}
  {@const { card, extras } = current.data}
  <div
    class="user-card"
    bind:this={element}
    style="left: {position.left}px; top: {position.top}px; transform-origin: {position.below
      ? 'top left'
      : 'bottom left'}"
    transition:scale={{ start: 0.96, duration: ms(160) }}
  >
    <div
      class="card-cover"
      style="background-image: url({avatarUrl(card.id)}), url({defaultAvatar})"
    ></div>
    <div class="card-head">
      <Avatar id={card.id} class="card-avatar" />
      <div class="card-who">
        <div class="card-flags">
          {#if card.country !== 'XX'}<Flag country={card.country} />{/if}
          {#if extras?.clan}
            <a class="clan-tag card-clan" href="/c/{extras.clan.id}" title={extras.clan.name}>
              [{extras.clan.tag}]
            </a>
          {/if}
          {#if extras?.group}
            <span class="card-group {groupColours[extras.group]}">{extras.group}</span>
          {/if}
        </div>
        <a class="card-name" href="/users/{card.id}">
          <b class={decorationClass(extras?.decoration)}>{card.username}</b>
        </a>
        <div class="card-status" class:online={card.is_online}>
          <i></i>
          <span>
            {card.is_online
              ? 'Online'
              : extras?.lastSeen
                ? `Last seen ${timeAgo(extras.lastSeen)}`
                : 'Offline'}
          </span>
        </div>
      </div>
      {#if session.user && session.user.id !== card.id && friend !== null}
        <div class="card-actions">
          <button
            class="card-action"
            class:is-friend={friend}
            type="button"
            title={friend ? 'Friends' : 'Add friend'}
            aria-label={friend ? 'Friends' : 'Add friend'}
            onclick={toggleFriend}
          >
            <i class="fa-solid {friend ? 'fa-user-check' : 'fa-user-plus'}"></i>
          </button>
        </div>
      {/if}
    </div>
    <div class="card-stats">
      <div><b>{rank(card.global_rank)}</b><span>Global</span></div>
      <div><b>{rank(card.country_rank)}</b><span>Country</span></div>
      <div><b>{card.pp.toLocaleString('en')}</b><span>pp</span></div>
      <div><b>{card.accuracy.toFixed(2)}%</b><span>Accuracy</span></div>
    </div>
  </div>
{/if}
