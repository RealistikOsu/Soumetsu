<script lang="ts">
  import { tabInk } from '@soumetsu/ui';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import {
    adminUser,
    grantDecoration,
    revokeDecoration,
    saveAdminUser,
    userAction,
    userIps
  } from '$lib/api/admin';
  import type { UserEdit } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import { userExtras } from '$lib/api/site';
  import { bannerUrl } from '$lib/assets';
  import { Privilege } from '$lib/auth/privileges';
  import HwidDialog from '$lib/components/admin/HwidDialog.svelte';
  import IpDialog from '$lib/components/admin/IpDialog.svelte';
  import { rememberUser } from '$lib/components/admin/recent';
  import UserDialogs from '$lib/components/admin/UserDialogs.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import BannerImage from '$lib/components/BannerImage.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import { countries, countryName } from '$lib/countries';
  import { decorations, shopDecorations, supporterDecorations } from '$lib/decorations';
  import { flash } from '$lib/flash.svelte';
  import { fullDate, timeAgo } from '$lib/format';
  import { allowed, modeNames, relaxNames } from '$lib/modes';

  const id = $derived(Number(page.params.id));
  let version = $state(0);
  const detail = query((signal) => {
    void version;
    return adminUser(id, signal);
  });
  // Only for the banner; a hidden profile just keeps the default one.
  const extras = query((signal) => userExtras(id, signal));
  const ips = query((signal) =>
    detail.state.status === 'ready' && detail.state.data.canViewIps
      ? userIps(id, signal)
      : Promise.resolve([])
  );

  // The endpoint also returns every other account on the same addresses, so each IP can repeat.
  const ownIps = $derived(
    ips.state.status === 'ready'
      ? ips.state.data
          .filter((row) => row.userid === id)
          .sort((a, b) => b.occurencies - a.occurencies)
      : []
  );

  const tabs = ['account', 'moderation', 'hardware', 'danger'] as const;
  const tab = $derived(
    tabs.find((t) => t === page.url.searchParams.get('tab')) ?? ('account' as const)
  );

  let form = $state<UserEdit | null>(null);
  let reason = $state('');
  let bypass = $state(false);
  let whitelist = $state(0);
  let dialog = $state<string | null>(null);
  let hwidOpen = $state(false);
  let ipLookup = $state<string | null>(null);
  let saving = $state(false);
  let grant = $state('');
  let menu = $state<HTMLDetailsElement>();

  const saved = $derived.by((): UserEdit | null => {
    if (detail.state.status !== 'ready') return null;
    const { user } = detail.state.data;
    return {
      aka: user.aka,
      email: user.email,
      country: user.country,
      privilege: user.privileges,
      userpage: user.userpage,
      notes: user.notes,
      badges: user.badges
    };
  });

  const edit = (from: UserEdit) => ({ ...from, badges: [...from.badges] });

  $effect(() => {
    if (detail.state.status !== 'ready' || !saved) return;
    const { user } = detail.state.data;
    form = edit(saved);
    bypass = user.bypassHwid;
    whitelist = user.whitelistModes;
    rememberUser({ id: user.id, username: user.username, group: user.group });
  });

  const fields = ['aka', 'email', 'country', 'privilege', 'userpage', 'notes'] as const;
  const changes = $derived.by(() => {
    const current = form;
    if (!current || !saved) return 0;
    const badges = current.badges.join() !== saved.badges.join() ? 1 : 0;
    return fields.filter((key) => current[key] !== saved[key]).length + badges;
  });

  const now = () => Date.now() / 1000;

  function closeMenu() {
    if (menu) menu.open = false;
  }

  async function run(body: { action: string } & Record<string, unknown>, success: string) {
    try {
      await userAction(id, body);
      flash.show('success', success);
      if (body.action === 'delete') {
        goto('/admin/users');
      } else {
        version++;
      }
      return true;
    } catch (error) {
      flash.show('error', describe(error));
      return false;
    }
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!form) return;
    saving = true;
    try {
      await saveAdminUser(id, form);
      flash.show('success', 'User successfully edited!');
      version++;
    } catch (error) {
      flash.show('error', describe(error));
    }
    saving = false;
  }

  async function decorate(action: typeof grantDecoration, key: string, success: string) {
    try {
      await action(id, key);
      flash.show('success', success);
      grant = '';
      version++;
    } catch (error) {
      flash.show('error', describe(error));
    }
  }

  const slots = [0, 1, 2, 3, 4, 5];

  const whitelistCount = (modes: number) =>
    [0, 1, 2].reduce(
      (total, rx) =>
        total +
        [0, 1, 2, 3].filter((mode) => allowed(mode, rx) && modes & (1 << (mode + rx * 4))).length,
      0
    );

  function logLook(summary: string) {
    const text = summary.toLowerCase();
    if (text.includes('silence')) return ['c-purple', 'fa-comment-slash'];
    if (text.includes('restrict')) return ['c-orange', 'fa-circle-exclamation'];
    if (text.startsWith('un')) return ['c-green', 'fa-rotate-left'];
    return ['c-red', 'fa-ban'];
  }
</script>

<svelte:window
  onclick={(event) => {
    if (menu?.open && !menu.contains(event.target as Node)) menu.open = false;
  }}
/>

{#if detail.state.status === 'error'}
  <a class="back" href="/admin/users"><i class="fa-solid fa-arrow-left"></i>Users</a>
  <p class="panel empty-note">{describe(detail.state.error)}</p>
{:else if detail.state.status === 'loading' && !form}
  <span class="skel" style="width: 100%; height: 200px"></span>
{:else if detail.state.status === 'ready' && form}
  {@const { user, groups, badgeChoices, banLogs, hwidCount, canViewIps, callerPrivileges } =
    detail.state.data}
  {@const banned = user.privileges === 0}
  {@const restricted = !banned && !(user.privileges & Privilege.Public)}
  {@const supporter = !!(user.privileges & Privilege.Donor)}
  {@const canManagePrivileges = !!(callerPrivileges & Privilege.AdminManagePrivilege)}
  {@const can = (flag: number) => !!(callerPrivileges & flag)}
  {@const extra = extras.state.status === 'ready' ? extras.state.data : null}
  {@const whitelisted = whitelistCount(user.whitelistModes)}

  <section
    class="user-head"
    style={extra?.banner?.type === 2
      ? `background-color: ${extra.banner.value}`
      : 'background-image: url(/img/banner-default.png)'}
  >
    {#if extra?.banner?.type === 1}
      <BannerImage src={bannerUrl(user.id)} position={extra.banner} />
    {/if}
    <div class="user-top">
      <Avatar id={user.id} />
      <div class="user-who">
        <div class="user-name">
          <h1>{user.username}</h1>
          {#if user.online}<span class="online-dot" title="Online"></span>{/if}
        </div>
        <div class="user-pills">
          <span class={user.group.colour}>{user.group.name}</span>
          <!-- The group is named after the privileges, so it often says this already. -->
          {#if banned && user.group.name.toLowerCase() !== 'banned'}
            <span class="c-red">Banned</span>
          {/if}
          {#if restricted && user.group.name.toLowerCase() !== 'restricted'}
            <span class="c-orange">Restricted</span>
          {/if}
          {#if user.frozen}<span class="c-lblue">Frozen</span>{/if}
          {#if user.silenceEnd > now()}
            <span class="c-purple">Silenced until {fullDate(user.silenceEnd)}</span>
          {/if}
          {#if supporter && user.donorExpire}
            <span class="c-yellow">Supporter until {fullDate(user.donorExpire)}</span>
          {/if}
          {#if whitelisted}
            <span class="c-green"
              >Whitelisted in {whitelisted} {whitelisted === 1 ? 'mode' : 'modes'}</span
            >
          {/if}
        </div>
        <div class="user-meta">
          <span><Flag country={user.country} /> {countryName(user.country, 'en')}</span>
          <span>ID <b>{user.id}</b></span>
          {#if user.clan}
            <span>Clan <a href="/admin/clans/{user.clan.id}"><b>[{user.clan.tag}]</b></a></span>
          {/if}
          {#if user.previousNames.length}
            <span class="name-history">
              Previously
              {#each user.previousNames as name (name)}
                <b>{name}</b><button
                  type="button"
                  title="Remove from their name history"
                  aria-label="Remove {name} from their name history"
                  onclick={() =>
                    confirm(`Remove ${name} from their past usernames?`) &&
                    run({ action: 'forget-name', username: name }, 'Past username removed.')}
                  ><i class="fa-solid fa-xmark"></i></button
                >
              {/each}
            </span>
          {/if}
        </div>
      </div>
      <div class="user-actions">
        <a class="btn" href="/users/{user.id}">
          <i class="fa-solid fa-arrow-up-right-from-square"></i>Profile
        </a>
        <details class="score-menu user-menu" bind:this={menu}>
          <summary class="btn" title="More actions" aria-label="More actions">
            <i class="fa-solid fa-ellipsis"></i>
          </summary>
          <div>
            <button type="button" onclick={() => (closeMenu(), (dialog = 'rename'))}>
              <i class="fa-solid fa-tag"></i>Rename user
            </button>
            <button type="button" onclick={() => (closeMenu(), (dialog = 'password'))}>
              <i class="fa-solid fa-key"></i>Change password
            </button>
            <button type="button" onclick={() => (closeMenu(), (dialog = 'supporter'))}>
              <i class="fa-solid fa-heart"></i>Supporter
            </button>
            {#if can(Privilege.AdminManageUsers)}
              <button
                type="button"
                onclick={() => {
                  closeMenu();
                  run({ action: 'freeze' }, user.frozen ? 'Account unfrozen.' : 'Account frozen.');
                }}
              >
                <i class="fa-solid fa-snowflake"></i>{user.frozen ? 'Unfreeze' : 'Freeze'}
              </button>
            {/if}
            {#if can(Privilege.AdminKickUsers)}
              <button
                type="button"
                onclick={() => {
                  closeMenu();
                  run({ action: 'kick' }, 'Kicked from Bancho.');
                }}
              >
                <i class="fa-solid fa-plug-circle-xmark"></i>Kick from Bancho
              </button>
            {/if}
          </div>
        </details>
      </div>
    </div>
    <nav class="user-tabs" use:tabInk>
      <a class:active={tab === 'account'} href="?tab=account" data-sveltekit-replacestate>
        <i class="fa-solid fa-user-pen"></i>Account
      </a>
      <a class:active={tab === 'moderation'} href="?tab=moderation" data-sveltekit-replacestate>
        <i class="fa-solid fa-gavel"></i>Moderation
        {#if banLogs.length}<small>{banLogs.length}</small>{/if}
      </a>
      <a class:active={tab === 'hardware'} href="?tab=hardware" data-sveltekit-replacestate>
        <i class="fa-solid fa-microchip"></i>Hardware
        {#if hwidCount}<small>{hwidCount}</small>{/if}
      </a>
      <a
        class="danger"
        class:active={tab === 'danger'}
        href="?tab=danger"
        data-sveltekit-replacestate
      >
        <i class="fa-solid fa-triangle-exclamation"></i>Danger zone
      </a>
    </nav>
  </section>

  {#if banned || restricted || user.frozen}
    <div class="user-standing {banned ? 'c-red' : restricted ? 'c-orange' : 'c-lblue'}">
      <i
        class="fa-solid {banned ? 'fa-ban' : restricted ? 'fa-circle-exclamation' : 'fa-snowflake'}"
      ></i>
      <div>
        <b>{banned ? 'Banned' : restricted ? 'Restricted' : 'Frozen'}</b>
        {#if user.frozen && !banned && !restricted && user.freezeDate}
          since {fullDate(user.freezeDate)}
        {/if}
        {#if user.banReason && (banned || restricted)}<p>{user.banReason}</p>{/if}
      </div>
    </div>
  {/if}

  <dl class="user-facts">
    <div>
      <dt>Joined</dt>
      <dd>{fullDate(user.registered)}</dd>
    </div>
    <div>
      <dt>Last seen</dt>
      <dd>{user.online ? 'Online now' : user.lastSeen ? timeAgo(user.lastSeen) : 'Never'}</dd>
    </div>
    <div>
      <dt>Standing</dt>
      <dd>
        {#if banned}
          <i class="fa-solid fa-ban" style="color: var(--red)"></i> Banned
        {:else if restricted}
          <i class="fa-solid fa-circle-exclamation" style="color: var(--orange)"></i> Restricted
        {:else}
          <i class="fa-solid fa-circle-check" style="color: var(--green)"></i> Good
        {/if}
      </dd>
    </div>
    <div>
      <dt>HWID logs</dt>
      <dd>
        {hwidCount}
        {#if hwidCount}<a href="?tab=hardware" data-sveltekit-replacestate>View</a>{/if}
      </dd>
    </div>
    {#if canViewIps}
      <div>
        <dt>Last IP</dt>
        <dd><code>{user.ip ?? 'None'}</code></dd>
      </div>
    {/if}
  </dl>

  {#if tab === 'account'}
    <form class="user-split" onsubmit={save}>
      <div class="user-main">
        <div class="user-box">
          <h2>Details</h2>
          <div class="field-pair">
            <div class="field">
              <label for="aka">Also known as</label>
              <input id="aka" bind:value={form.aka} />
            </div>
            <div class="field">
              <label for="email">Email address</label>
              <input id="email" type="email" bind:value={form.email} />
            </div>
          </div>
          <div class="field-pair">
            <div class="field">
              <label for="country">Country</label>
              <select id="country" bind:value={form.country}>
                {#each countries as country (country.code)}
                  <option value={country.code}>{country.name}</option>
                {/each}
              </select>
            </div>
            <div class="field">
              <label for="privilege">Privilege group</label>
              <select id="privilege" bind:value={form.privilege} disabled={!canManagePrivileges}>
                {#each groups as group (`${group.privileges}-${group.name}`)}
                  <option value={group.privileges}>{group.name}</option>
                {/each}
                {#if !groups.some((g) => g.privileges === user.privileges)}
                  <option value={user.privileges}>Unknown ({user.privileges})</option>
                {/if}
              </select>
            </div>
          </div>
        </div>

        <div class="user-box">
          <h2>Badges <small>Up to 6, in this order</small></h2>
          <div class="badge-selects">
            {#each slots as slot (slot)}
              <select aria-label="Badge {slot + 1}" bind:value={form.badges[slot]}>
                <option value={0}>(None)</option>
                {#each badgeChoices as badge (badge.id)}
                  <option value={badge.id}>{badge.name}</option>
                {/each}
              </select>
            {/each}
          </div>
        </div>

        <div class="user-box">
          <h2><label for="userpage">Userpage</label> <small>BBCode</small></h2>
          <textarea id="userpage" rows="6" bind:value={form.userpage}></textarea>
        </div>

        <!-- Edits pile up across the tab, so saving stays where it can always be reached. -->
        <div class="save-bar" class:dirty={changes > 0}>
          <span>
            {changes ? `${changes} unsaved ${changes === 1 ? 'change' : 'changes'}` : 'No changes'}
          </span>
          <button
            class="btn"
            type="button"
            disabled={!changes}
            onclick={() => saved && (form = edit(saved))}
          >
            Discard
          </button>
          <button class="btn btn-green" type="submit" disabled={saving || !changes}>
            <i class="fa-solid fa-floppy-disk"></i>Save
          </button>
        </div>
      </div>

      <aside>
        <div class="user-box">
          <h2><label for="notes">Admin notes</label> <small>Staff only</small></h2>
          <textarea id="notes" rows="4" bind:value={form.notes}></textarea>
        </div>
        <div class="user-box">
          <h2>Decorations</h2>
          <div class="owned-chips">
            {#each user.owned as key (key)}
              <span>
                {decorations.find((d) => d.key === key)?.name ?? key}
                <button
                  type="button"
                  aria-label="Revoke {key}"
                  onclick={() => decorate(revokeDecoration, key, `Revoked ${key}.`)}
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </span>
            {:else}
              <span class="faint">None</span>
            {/each}
          </div>
          <div class="inline-save">
            <select aria-label="Decoration to grant" bind:value={grant}>
              <option value="">Choose a decoration</option>
              {#each [...supporterDecorations, ...shopDecorations].filter((d) => !user.owned.includes(d.key)) as deco (deco.key)}
                <option value={deco.key}>{deco.name} ({deco.category})</option>
              {/each}
            </select>
            <button
              class="btn"
              type="button"
              disabled={!grant}
              onclick={() => decorate(grantDecoration, grant, `Granted ${grant}.`)}
            >
              Grant
            </button>
          </div>
        </div>
      </aside>
    </form>
  {:else if tab === 'moderation'}
    <div class="user-split">
      <div class="user-main">
        {#if can(Privilege.AdminManageUsers) || can(Privilege.AdminBanUsers)}
          <div class="user-box">
            <h2><label for="reason">Restrict or ban</label></h2>
            <textarea
              id="reason"
              rows="2"
              maxlength="2048"
              placeholder="Reason, shown in the ban log"
              bind:value={reason}></textarea>
            <div class="user-buttons">
              {#if can(Privilege.AdminManageUsers)}
                <button
                  class="btn btn-orange"
                  type="button"
                  disabled={banned}
                  onclick={() =>
                    run(
                      { action: 'restrict', reason },
                      restricted ? 'Account unrestricted.' : 'Account restricted.'
                    )}
                >
                  {restricted ? 'Unrestrict' : 'Restrict'}
                </button>
              {/if}
              {#if can(Privilege.AdminBanUsers)}
                <button
                  class="btn btn-red"
                  type="button"
                  onclick={() =>
                    run(
                      { action: 'ban', reason },
                      banned ? 'Account unbanned.' : 'Account banned.'
                    )}
                >
                  {banned ? 'Unban' : 'Ban'}
                </button>
              {/if}
            </div>
          </div>
        {/if}
        <div class="user-box">
          <h2>Ban log</h2>
          <ol class="ban-log">
            {#each banLogs as entry, i (i)}
              {@const [colour, icon] = logLook(entry.summary)}
              <li class={colour}>
                <i class="fa-solid {icon}"></i>
                <span
                  ><b>{entry.from_name}</b>
                  {entry.summary.toLowerCase()} <b>{user.username}</b></span
                >
                <time>{timeAgo(entry.ts)}</time>
                {#if entry.detail}<p>{entry.detail}</p>{/if}
              </li>
            {/each}
            <li class="c-green">
              <i class="fa-solid fa-user-plus"></i>
              <span><b>{user.username}</b> joined RealistikOsu</span>
              <time>{fullDate(user.registered)}</time>
            </li>
          </ol>
        </div>
      </div>
      <aside class="user-box whitelist">
        <h2>Whitelist</h2>
        <p class="muted">Skips the automatic checks in the modes you turn on.</p>
        <div class="whitelist-grid">
          <span></span>
          {#each modeNames as name, mode (mode)}
            <span><img src="/img/modes/mode-{mode}.png" alt={name} title={name} /></span>
          {/each}
          <!-- The whitelist has no lazer bits. -->
          {#each relaxNames.slice(0, 3) as rxName, rx (rx)}
            <span class="row-label">{rxName}</span>
            {#each modeNames as name, mode (mode)}
              {#if allowed(mode, rx)}
                <label class="switch" title="{rxName} {name}">
                  <input
                    type="checkbox"
                    checked={!!(whitelist & (1 << (mode + rx * 4)))}
                    onchange={() => (whitelist ^= 1 << (mode + rx * 4))}
                  />
                  <span></span>
                </label>
              {:else}
                <span class="none"></span>
              {/if}
            {/each}
          {/each}
        </div>
        <button
          class="btn"
          type="button"
          onclick={() => run({ action: 'whitelist', whitelist }, 'Whitelist saved.')}
        >
          Save whitelist
        </button>
      </aside>
    </div>
  {:else if tab === 'hardware'}
    <div class="user-split">
      <div class="user-main">
        {#if canViewIps}
          <div class="user-box">
            <h2>IP addresses <small>Most used first</small></h2>
            {#if ips.state.status === 'ready'}
              <ul class="ip-list">
                {#each ownIps as row (row.ip)}
                  <li>
                    <code>{row.ip}</code>
                    <span>{row.occurencies} {row.occurencies === 1 ? 'login' : 'logins'}</span>
                    <button type="button" onclick={() => (ipLookup = row.ip)}>
                      Other accounts
                    </button>
                  </li>
                {:else}
                  <li class="faint">No IPs logged.</li>
                {/each}
              </ul>
            {:else if ips.state.status === 'error'}
              <p class="muted">{describe(ips.state.error)}</p>
            {:else}
              <span class="skel" style="width: 100%; height: 80px"></span>
            {/if}
          </div>
        {/if}
      </div>
      <aside class="user-box">
        <h2>HWID</h2>
        <button class="hwid-count" type="button" onclick={() => (hwidOpen = true)}>
          <i class="fa-solid fa-fingerprint"></i>
          <span>{hwidCount} {hwidCount === 1 ? 'log' : 'logs'}</span>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
        <div class="field">
          <label for="hwid">HWID check</label>
          <div class="inline-save">
            <select
              id="hwid"
              value={bypass ? '1' : '0'}
              onchange={(event) => (bypass = event.currentTarget.value === '1')}
            >
              <option value="0">Enforce matching</option>
              <option value="1">Allow bypass</option>
            </select>
            <button
              class="btn"
              type="button"
              onclick={() => run({ action: 'hwid-bypass', bypass }, 'HWID check saved.')}
            >
              Save
            </button>
          </div>
        </div>
      </aside>
    </div>
  {:else}
    <div class="user-box danger-rows">
      <h2>Danger zone <small>Each one asks before it runs</small></h2>
      {#if can(Privilege.AdminWipeUsers)}
        <button type="button" onclick={() => (dialog = 'rollback')}>
          <i class="fa-solid fa-clock-rotate-left"></i>
          <span>Roll back scores<small>Remove scores set after a date</small></span>
        </button>
        <button type="button" onclick={() => (dialog = 'wipe-profile-comments')}>
          <i class="fa-solid fa-comment-slash"></i><span>Wipe comments on their profile</span>
        </button>
        <button type="button" onclick={() => (dialog = 'wipe-their-comments')}>
          <i class="fa-solid fa-comments"></i><span>Wipe comments they wrote</span>
        </button>
      {/if}
      <button type="button" onclick={() => (dialog = 'reset-avatar')}>
        <i class="fa-solid fa-image"></i><span>Reset avatar</span>
      </button>
      <button type="button" onclick={() => (dialog = 'clear-hwid')}>
        <i class="fa-solid fa-microchip"></i><span>Clear HWID matches</span>
      </button>
      {#if can(Privilege.PanelManageClans)}
        <button type="button" onclick={() => (dialog = 'kick-clan')}>
          <i class="fa-solid fa-shield-halved"></i><span>Kick from their clan</span>
        </button>
      {/if}
      {#if can(Privilege.AdminWipeUsers)}
        <button type="button" onclick={() => (dialog = 'wipe')}>
          <i class="fa-solid fa-eraser"></i>
          <span>Wipe account<small>Scores and stats in the modes you pick</small></span>
        </button>
      {/if}
      <button type="button" onclick={() => (dialog = 'delete')}>
        <i class="fa-solid fa-trash-can"></i><span
          >Delete account<small>Can't be undone</small></span
        >
      </button>
    </div>
  {/if}

  <UserDialogs {user} bind:open={dialog} {run} />
  <HwidDialog bind:open={hwidOpen} userId={user.id} />
  <IpDialog
    bind:open={() => ipLookup !== null, (value) => !value && (ipLookup = null)}
    title="Accounts on {ipLookup}"
    userId={user.id}
    ip={ipLookup}
  />
{/if}
