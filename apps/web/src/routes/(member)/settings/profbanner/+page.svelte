<script lang="ts">
  import { describe } from '$lib/api/messages';
  import { saveBanner } from '$lib/api/linking';
  import { deleteBanner, uploadBanner } from '$lib/api/settings';
  import { isSupporter } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import { bannerUrl } from '$lib/assets';
  import SupporterOnly from '$lib/components/SupporterOnly.svelte';
  import { flash } from '$lib/flash.svelte';

  let type = $state<0 | 1 | 2>(1);
  let colour = $state('#548aca');
  let file = $state<File | null>(null);
  let busy = $state(false);
  let version = $state(Date.now());

  const supporter = $derived(!!session.user && isSupporter(session.user.privileges));
  const preview = $derived(file ? URL.createObjectURL(file) : null);
  const current = $derived(session.user ? `${bannerUrl(session.user.id)}?v=${version}` : '');

  async function save(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    try {
      if (type === 0) await deleteBanner().catch(() => null);
      if (type === 1 && file) {
        await uploadBanner(file);
        file = null;
        version = Date.now();
      }
      await saveBanner(type, type === 2 ? colour : undefined);
      flash.show('success', 'Your profile banner has been saved.');
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

<h2 class="section-title c-green"><i class="fa-solid fa-panorama"></i>Profile banner</h2>
{#if !supporter}
  <SupporterOnly />
{:else}
  <form onsubmit={save}>
    <div class="panel form-panel c-green">
      <div class="field">
        <span class="label">Banner type</span>
        <div class="choice">
          <label><input type="radio" bind:group={type} value={0} /><span>None</span></label>
          <label>
            <input type="radio" bind:group={type} value={1} />
            <span><i class="fa-solid fa-image"></i>Image</span>
          </label>
          <label>
            <input type="radio" bind:group={type} value={2} />
            <span><i class="fa-solid fa-fill-drip"></i>Solid colour</span>
          </label>
        </div>
      </div>

      {#if type === 1}
        <div class="banner-preview" style="background-image: url({preview ?? current})">
          {#if !preview}Your current banner{/if}
        </div>
        <div class="avatar-actions">
          <label class="btn" for="banner-file"
            ><i class="fa-solid fa-folder-open"></i>Open file</label
          >
          <input
            id="banner-file"
            type="file"
            accept="image/*"
            hidden
            onchange={(event) => (file = event.currentTarget.files?.[0] ?? null)}
          />
        </div>
      {:else if type === 2}
        <div class="banner-preview" style="background-color: {colour}"></div>
        <div class="field">
          <label for="banner-colour">Colour</label>
          <input id="banner-colour" type="color" bind:value={colour} />
        </div>
      {/if}
    </div>
    <div class="form-actions">
      <button class="btn btn-blue" type="submit" disabled={busy}>
        <i class="fa-solid fa-floppy-disk"></i>Save
      </button>
    </div>
  </form>
{/if}
