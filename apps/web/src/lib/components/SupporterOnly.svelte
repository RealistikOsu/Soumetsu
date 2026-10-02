<script lang="ts">
  import { m } from '$lib/paraglide/messages';
</script>

<div class="panel supporter-only">
  <i class="fa-solid fa-lock"></i>
  <div>
    <b>{m.settings_supporter_only_title()}</b>
    <p>
      <a href="/donate">{m.settings_supporter_only_link()}</a>{m.settings_supporter_only_end()}
    </p>
  </div>
</div>
