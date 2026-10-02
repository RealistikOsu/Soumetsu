<script lang="ts">
  import { flagUrl } from '$lib/assets';
  import { getLocale, languageFlags, languageNames, locales, setLocale } from '$lib/i18n';
  import { m } from '$lib/paraglide/messages';

  // `up` opens the list above the button, for the footer at the bottom of the page.
  let { id, up = false }: { id?: string; up?: boolean } = $props();

  let open = $state(false);
  let root: HTMLElement;
  const current = getLocale();

  function onWindowClick(event: MouseEvent) {
    if (!root.contains(event.target as Node)) open = false;
  }
</script>

<svelte:window
  onclick={onWindowClick}
  onkeydown={(event) => event.key === 'Escape' && (open = false)}
/>

<div class="lang-pick" class:up bind:this={root}>
  <button
    {id}
    class="lang-current"
    type="button"
    aria-label={m.common_language()}
    aria-haspopup="listbox"
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    <img class="flag" src={flagUrl(languageFlags[current])} alt="" />
    {languageNames[current]}
    <i class="fa-solid fa-chevron-down"></i>
  </button>
  {#if open}
    <ul class="lang-list" role="listbox" aria-label={m.common_language()}>
      {#each locales as locale (locale)}
        <li role="option" aria-selected={locale === current}>
          <button
            type="button"
            lang={locale}
            onclick={() => (locale === current ? (open = false) : setLocale(locale))}
          >
            <img class="flag" src={flagUrl(languageFlags[locale])} alt="" />
            {languageNames[locale]}
            {#if locale === current}<i class="fa-solid fa-check"></i>{/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
