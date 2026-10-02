<script lang="ts">
  import { getLocale, languageNames, locales, setLocale, type Locale } from '$lib/i18n';
  import { m } from '$lib/paraglide/messages';
</script>

<footer class="foot">
  <span>© {new Date().getFullYear()} RealistikOsu</span>
  <span>{m.footer_not_affiliated()}</span>
  <a href="/about">{m.footer_about()}</a>
  <a href="/team">{m.footer_team()}</a>
  <a href="https://github.com/RealistikOsu"><i class="fa-brands fa-github"></i>GitHub</a>
  <label class="language">
    <i class="fa-solid fa-language"></i>
    <select
      aria-label={m.common_language()}
      value={getLocale()}
      onchange={(event) => setLocale(event.currentTarget.value as Locale)}
    >
      {#each locales as locale (locale)}
        <option value={locale}>{languageNames[locale]}</option>
      {/each}
    </select>
  </label>
</footer>
