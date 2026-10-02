<script lang="ts">
  import LanguagePicker from './LanguagePicker.svelte';
  import { m } from '$lib/paraglide/messages';
</script>

<footer class="foot">
  <span>© {new Date().getFullYear()} RealistikOsu</span>
  <span>{m.footer_not_affiliated()}</span>
  <a href="/about">{m.footer_about()}</a>
  <a href="/team">{m.footer_team()}</a>
  <a href="https://github.com/RealistikOsu"><i class="fa-brands fa-github"></i>GitHub</a>
  <LanguagePicker up />
</footer>
