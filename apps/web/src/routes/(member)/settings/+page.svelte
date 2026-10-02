<script lang="ts">
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import { saveSettings, settings } from '$lib/api/settings';
  import { session } from '$lib/auth/session.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { flash } from '$lib/flash.svelte';
  import { modeNames } from '$lib/modes';

  const playStyles = [
    'Mouse',
    'Tablet',
    'Keyboard',
    'Touchscreen',
    'Spoon',
    'Leap motion',
    'Oculus rift',
    'Dick',
    'Eggplant'
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
      flash.show('success', 'Your settings have been saved.');
    } catch (error) {
      flash.show('error', describe(error));
    } finally {
      busy = false;
    }
  }
</script>

{#if loaded.state.status === 'error'}
  <p class="panel empty-note">Couldn't load your settings. Try again in a bit.</p>
{:else if ready}
  <form onsubmit={save}>
    <SectionTitle colour="c-blue" icon="fa-user">General</SectionTitle>
    <div class="panel form-panel c-blue">
      <div class="field">
        <label for="username">Username</label>
        <input id="username" type="text" value={session.user?.username} disabled />
        <small
          >Supporters can change it under <a href="/settings/change-username">Change username</a
          >.</small
        >
      </div>
      <div class="field">
        <label for="email">Email address</label>
        <input
          id="email"
          type="email"
          value={loaded.state.status === 'ready' ? loaded.state.data.email : ''}
          disabled
        />
        <small>Change it from the <a href="/settings/password">Password</a> page.</small>
      </div>
      <div class="field">
        <label for="aka">Alternative username</label>
        <input id="aka" type="text" bind:value={aka} placeholder="Also known as..." />
        <small>Shown on your profile. It can't be used to log in.</small>
      </div>
      <div class="field">
        <span class="label">Favourite mode</span>
        <div class="choice">
          {#each modeNames as name, i (name)}
            <label>
              <input type="radio" name="favourite_mode" value={i} bind:group={favourite} />
              <span><img src="/img/modes/mode-{i}.png" alt="" />{name}</span>
            </label>
          {/each}
        </div>
      </div>
    </div>

    <SectionTitle colour="c-purple" icon="fa-gamepad">Playstyle</SectionTitle>
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
      <SectionTitle colour="c-yellow" icon="fa-certificate">Custom badge</SectionTitle>
      <div class="panel form-panel c-yellow">
        <label class="switch">
          <input type="checkbox" bind:checked={badge.show} /><span></span>Show my custom badge
        </label>
        <div class="field">
          <label for="badge-icon">Icon</label>
          <input id="badge-icon" type="text" bind:value={badge.icon} placeholder="fa-star" />
          <small>A Font Awesome icon name, like <code>fa-star</code>.</small>
        </div>
        <div class="field">
          <label for="badge-name">Name</label>
          <input id="badge-name" type="text" bind:value={badge.name} />
        </div>
      </div>
    {/if}

    <SectionTitle colour="c-teal" icon="fa-comments">Comments</SectionTitle>
    <div class="panel form-panel c-teal">
      <label class="switch">
        <input type="checkbox" bind:checked={commentsOff} /><span></span>Disable comments on my
        profile
      </label>
    </div>

    <div class="form-actions">
      <button class="btn btn-blue" type="submit" disabled={busy}>Save</button>
    </div>
  </form>
{:else}
  <div class="panel"><span class="skel" style="width: 100%; height: 240px"></span></div>
{/if}
