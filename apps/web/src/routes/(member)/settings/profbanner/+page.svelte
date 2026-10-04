<script lang="ts">
  import { describe } from '$lib/api/messages';
  import { saveBanner } from '$lib/api/linking';
  import { deleteBanner, uploadBanner } from '$lib/api/settings';
  import { userExtras, type BannerPosition } from '$lib/api/site';
  import { isSupporter } from '$lib/auth/privileges';
  import { session } from '$lib/auth/session.svelte';
  import { bannerUrl } from '$lib/assets';
  import BannerImage from '$lib/components/BannerImage.svelte';
  import SupporterOnly from '$lib/components/SupporterOnly.svelte';
  import { flash } from '$lib/flash.svelte';
  import { m } from '$lib/paraglide/messages';

  const CENTRED: BannerPosition = { x: 50, y: 50, zoom: 100 };

  let type = $state<0 | 1 | 2>(1);
  let colour = $state('#548aca');
  let position = $state<BannerPosition>({ ...CENTRED });
  let file = $state<File | null>(null);
  let busy = $state(false);
  let version = $state(Date.now());
  let drag: { pointer: number; x: number; y: number } | null = null;

  const supporter = $derived(!!session.user && isSupporter(session.user.privileges));
  const preview = $derived(file ? URL.createObjectURL(file) : null);
  const current = $derived(session.user ? `${bannerUrl(session.user.id)}?v=${version}` : '');

  // Start from what's saved, so saving again doesn't quietly undo an earlier choice.
  $effect(() => {
    const id = session.user?.id;
    if (!id) return;
    userExtras(id).then(
      ({ banner }) => {
        if (!banner) return;
        type = banner.type;
        if (banner.type === 1) position = { x: banner.x, y: banner.y, zoom: banner.zoom };
        else colour = banner.value;
      },
      () => null
    );
  });

  function pick(event: Event & { currentTarget: HTMLInputElement }) {
    file = event.currentTarget.files?.[0] ?? null;
    position = { ...CENTRED };
  }

  // Dragging moves the picture with the pointer, so the kept point moves the other way.
  function grab(event: PointerEvent & { currentTarget: HTMLElement }) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function move(event: PointerEvent & { currentTarget: HTMLElement }) {
    if (drag?.pointer !== event.pointerId) return;
    const box = event.currentTarget.getBoundingClientRect();
    const scale = 100 / (position.zoom / 100);
    const clamp = (value: number) => Math.round(Math.min(100, Math.max(0, value)));
    position.x = clamp(position.x - ((event.clientX - drag.x) / box.width) * scale);
    position.y = clamp(position.y - ((event.clientY - drag.y) / box.height) * scale);
    drag.x = event.clientX;
    drag.y = event.clientY;
  }

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
      await saveBanner(type, type === 2 ? colour : undefined, type === 1 ? position : undefined);
      flash.show('success', m.settings_banner_saved());
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

<h2 class="section-title c-green"><i class="fa-solid fa-panorama"></i>{m.settings_tab_banner()}</h2>
{#if !supporter}
  <SupporterOnly />
{:else}
  <form onsubmit={save}>
    <div class="panel form-panel c-green">
      <div class="field">
        <span class="label">{m.settings_banner_type()}</span>
        <div class="choice">
          <label
            ><input type="radio" bind:group={type} value={0} /><span>{m.settings_none()}</span
            ></label
          >
          <label>
            <input type="radio" bind:group={type} value={1} />
            <span><i class="fa-solid fa-image"></i>{m.settings_banner_image()}</span>
          </label>
          <label>
            <input type="radio" bind:group={type} value={2} />
            <span><i class="fa-solid fa-fill-drip"></i>{m.settings_banner_solid()}</span>
          </label>
        </div>
      </div>

      {#if type === 1}
        <p class="muted">{m.settings_banner_position()}</p>
        <div class="banner-frames">
          <figure>
            <div
              class="banner-frame wide"
              role="presentation"
              onpointerdown={grab}
              onpointermove={move}
              onpointerup={() => (drag = null)}
              onpointercancel={() => (drag = null)}
            >
              <BannerImage src={preview ?? current} {position} />
            </div>
            <figcaption>{m.settings_banner_wide()}</figcaption>
          </figure>
          <figure>
            <div
              class="banner-frame phone"
              role="presentation"
              onpointerdown={grab}
              onpointermove={move}
              onpointerup={() => (drag = null)}
              onpointercancel={() => (drag = null)}
            >
              <BannerImage src={preview ?? current} {position} />
            </div>
            <figcaption>{m.settings_banner_phone()}</figcaption>
          </figure>
        </div>
        <div class="field banner-zoom">
          <label for="banner-zoom">{m.settings_banner_zoom()}</label>
          <input id="banner-zoom" type="range" min="100" max="300" bind:value={position.zoom} />
          <button class="btn" type="button" onclick={() => (position = { ...CENTRED })}>
            {m.settings_banner_reset()}
          </button>
        </div>
        <div class="avatar-actions">
          <label class="btn" for="banner-file"
            ><i class="fa-solid fa-folder-open"></i>{m.settings_open_file()}</label
          >
          <input id="banner-file" type="file" accept="image/*" hidden onchange={pick} />
        </div>
      {:else if type === 2}
        <div class="banner-preview" style="background-color: {colour}"></div>
        <div class="field">
          <label for="banner-colour">{m.settings_banner_colour()}</label>
          <input id="banner-colour" type="color" bind:value={colour} />
        </div>
      {/if}
    </div>
    <div class="form-actions">
      <button class="btn btn-blue" type="submit" disabled={busy}>
        <i class="fa-solid fa-floppy-disk"></i>{m.settings_save()}
      </button>
    </div>
  </form>
{/if}
