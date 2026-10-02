<script lang="ts">
  import { describe } from '$lib/api/messages';
  import { deleteAvatar, uploadAvatar } from '$lib/api/settings';
  import { isSupporter } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import { avatarUrl, defaultAvatar } from '$lib/assets';
  import { flash } from '$lib/flash.svelte';
  import { m } from '$lib/paraglide/messages';

  let file = $state<File | null>(null);
  let busy = $state(false);
  // Bumped after a change so the browser fetches the new picture.
  let version = $state(Date.now());

  const preview = $derived(file ? URL.createObjectURL(file) : null);
  const current = $derived(session.user ? `${avatarUrl(session.user.id)}?v=${version}` : '');
  const shown = $derived(preview ?? current);
  let missing = $state(false);

  $effect(() => {
    void shown;
    missing = false;
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!file) return;
    // Animated pictures are a supporter perk, which the API enforces too.
    if (file.type === 'image/gif' && !(session.user && isSupporter(session.user.privileges))) {
      return flash.show('error', m.settings_avatar_gif_supporter());
    }
    busy = true;
    try {
      await uploadAvatar(file);
      file = null;
      version = Date.now();
      flash.show('success', m.settings_avatar_saved());
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }

  async function remove() {
    try {
      await deleteAvatar();
      version = Date.now();
      flash.show('success', m.settings_avatar_removed());
    } catch (error) {
      flash.show('error', describe(error));
    }
  }
</script>

<form onsubmit={save}>
  <h2 class="section-title c-teal"><i class="fa-solid fa-image"></i>{m.settings_tab_avatar()}</h2>
  <div class="panel form-panel c-teal avatar-panel">
    <img
      class="avatar current"
      src={missing ? defaultAvatar : shown}
      alt={m.settings_avatar_current_alt()}
      onerror={() => (missing = true)}
    />
    <div>
      <p>{m.settings_avatar_sizes()}</p>
      <div class="avatar-sizes">
        <img class="avatar size-64" src={shown} alt="" />
        <img class="avatar size-32" src={shown} alt="" />
        <img class="avatar size-20" src={shown} alt="" />
      </div>
      <div class="avatar-actions">
        <label class="btn" for="avatar-file"
          ><i class="fa-solid fa-folder-open"></i>{m.settings_open_file()}</label
        >
        <input
          id="avatar-file"
          type="file"
          accept="image/*"
          hidden
          onchange={(event) => (file = event.currentTarget.files?.[0] ?? null)}
        />
        <button class="btn btn-blue" type="submit" disabled={busy || !file}>
          <i class="fa-solid fa-floppy-disk"></i>{m.settings_save()}
        </button>
        <button class="btn" type="button" onclick={remove}
          ><i class="fa-solid fa-trash"></i>{m.settings_remove()}</button
        >
      </div>
    </div>
  </div>
</form>
