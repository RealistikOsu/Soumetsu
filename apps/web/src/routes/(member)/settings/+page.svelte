<script lang="ts">
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import { saveSettings, settings } from '$lib/api/settings';
  import { session } from '$lib/auth/session.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { flash } from '$lib/flash.svelte';
  import { getLocale, languageNames, locales, setLocale, type Locale } from '$lib/i18n';
  import { modeNames } from '$lib/modes';
  import { m } from '$lib/paraglide/messages';

  const playStyles = [
    m.settings_playstyle_mouse(),
    m.settings_playstyle_tablet(),
    m.settings_playstyle_keyboard(),
    m.settings_playstyle_touchscreen(),
    m.settings_playstyle_spoon(),
    m.settings_playstyle_leap_motion(),
    m.settings_playstyle_oculus_rift(),
    m.settings_playstyle_dick(),
    m.settings_playstyle_eggplant()
  ];

  const loaded = query((signal) => settings(signal));

  let aka = $state('');
  let favourite = $state(0);
  let style = $state(0);
  let commentsOff = $state(false);
  let badge = $state({ show: false, icon: '', name: '', allowed: false });
  let ready = $state(false);
  let busy = $state(false);

  $effect(() => {
    if (loaded.state.status !== 'ready' || ready) return;
    const data = loaded.state.data;
    aka = data.username_aka;
    favourite = data.favourite_mode;
    style = data.play_style;
    commentsOff = data.disabled_comments;
    badge = { ...data.custom_badge, allowed: data.custom_badge.can_custom_badge };
    ready = true;
  });

  const toggleStyle = (bit: number) => (style = style ^ bit);

  async function save(event: SubmitEvent) {
    event.preventDefault();
    busy = true;
    try {
      await saveSettings({
        username_aka: aka,
        favourite_mode: favourite,
        play_style: style,
        disabled_comments: commentsOff,
        ...(badge.allowed
          ? { custom_badge: { show: badge.show, icon: badge.icon, name: badge.name } }
          : {})
      });
      flash.show('success', m.settings_saved());
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

{#if loaded.state.status === 'error'}
  <p class="panel empty-note">{m.settings_load_failed()}</p>
{:else if ready}
  <form onsubmit={save}>
    <SectionTitle colour="c-blue" icon="fa-user">{m.settings_general()}</SectionTitle>
    <div class="panel form-panel c-blue">
      <div class="field">
        <label for="username">{m.settings_username()}</label>
        <input id="username" type="text" value={session.user?.username} disabled />
        <small
          >{m.settings_username_hint_start()}
          <a href="/settings/change-username">{m.settings_tab_username()}</a
          >{m.settings_username_hint_end()}</small
        >
      </div>
      <div class="field">
        <label for="email">{m.settings_email()}</label>
        <input
          id="email"
          type="email"
          value={loaded.state.status === 'ready' ? loaded.state.data.email : ''}
          disabled
        />
        <small
          >{m.settings_email_hint_start()}
          <a href="/settings/password">{m.settings_tab_password()}</a
          >{m.settings_email_hint_end()}</small
        >
      </div>
      <div class="field">
        <label for="aka">{m.settings_aka()}</label>
        <input id="aka" type="text" bind:value={aka} placeholder={m.settings_aka_placeholder()} />
        <small>{m.settings_aka_hint()}</small>
      </div>
      <div class="field">
        <span class="label">{m.settings_favourite_mode()}</span>
        <div class="choice">
          {#each modeNames as name, i (name)}
            <label>
              <input type="radio" name="favourite_mode" value={i} bind:group={favourite} />
              <span><img src="/img/modes/mode-{i}.png" alt="" />{name}</span>
            </label>
          {/each}
        </div>
      </div>
      <div class="field">
        <label for="language">{m.settings_language()}</label>
        <select
          id="language"
          value={getLocale()}
          onchange={(event) => setLocale(event.currentTarget.value as Locale)}
        >
          {#each locales as locale (locale)}
            <option value={locale}>{languageNames[locale]}</option>
          {/each}
        </select>
        <small>{m.settings_language_hint()}</small>
      </div>
    </div>

    <SectionTitle colour="c-purple" icon="fa-gamepad">{m.settings_playstyle()}</SectionTitle>
    <div class="panel form-panel c-purple">
      <div class="chips">
        {#each playStyles as name, i (name)}
          <label class="chip">
            <input
              type="checkbox"
              checked={(style & (1 << i)) !== 0}
              onchange={() => toggleStyle(1 << i)}
            />
            <span>{name}</span>
          </label>
        {/each}
      </div>
    </div>

    {#if badge.allowed}
      <SectionTitle colour="c-yellow" icon="fa-certificate">{m.settings_badge()}</SectionTitle>
      <div class="panel form-panel c-yellow">
        <label class="switch">
          <input type="checkbox" bind:checked={badge.show} /><span></span>{m.settings_badge_show()}
        </label>
        <div class="field">
          <label for="badge-icon">{m.settings_badge_icon()}</label>
          <input id="badge-icon" type="text" bind:value={badge.icon} placeholder="fa-star" />
          <small
            >{m.settings_badge_icon_hint_start()}
            <code>fa-star</code>{m.settings_badge_icon_hint_end()}</small
          >
        </div>
        <div class="field">
          <label for="badge-name">{m.settings_badge_name()}</label>
          <input id="badge-name" type="text" bind:value={badge.name} />
        </div>
      </div>
    {/if}

    <SectionTitle colour="c-teal" icon="fa-comments">{m.settings_comments()}</SectionTitle>
    <div class="panel form-panel c-teal">
      <label class="switch">
        <input type="checkbox" bind:checked={commentsOff} /><span
        ></span>{m.settings_comments_disable()}
      </label>
    </div>

    <div class="form-actions">
      <button class="btn btn-blue" type="submit" disabled={busy}>{m.settings_save()}</button>
    </div>
  </form>
{:else}
  <div class="panel"><span class="skel" style="width: 100%; height: 240px"></span></div>
{/if}
