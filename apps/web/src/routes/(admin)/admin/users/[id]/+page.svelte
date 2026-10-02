<script lang="ts">
  import { countryName } from '$lib/countries';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import { adminUser, saveAdminUser, userAction } from '$lib/api/admin';
  import type { UserEdit } from '$lib/api/admin';
  import { describe } from '$lib/api/messages';
  import { query } from '$lib/api/query.svelte';
  import { Privilege } from '$lib/auth/privileges';
  import AdminTag from '$lib/components/admin/AdminTag.svelte';
  import HwidDialog from '$lib/components/admin/HwidDialog.svelte';
  import IpDialog from '$lib/components/admin/IpDialog.svelte';
  import UserDialogs from '$lib/components/admin/UserDialogs.svelte';
  import Avatar from '$lib/components/Avatar.svelte';
  import Flag from '$lib/components/Flag.svelte';
  import SectionTitle from '$lib/components/SectionTitle.svelte';
  import { countries } from '$lib/countries';
  import { flash } from '$lib/flash.svelte';
  import { fullDate, timeAgo } from '$lib/format';
  import { allowed, modeNames, relaxNames } from '$lib/modes';

  const id = $derived(Number(page.params.id));
  let version = $state(0);
  const detail = query((signal) => {
    void version;
    return adminUser(id, signal);
  });

  let form = $state<UserEdit | null>(null);
  let reason = $state('');
  let bypass = $state(false);
  let whitelist = $state(0);
  let dialog = $state<string | null>(null);
  let hwidOpen = $state(false);
  let ipOpen = $state(false);
  let allIpsOpen = $state(false);
  let saving = $state(false);

  $effect(() => {
    if (detail.state.status !== 'ready') return;
    const { user } = detail.state.data;
    form = {
      aka: user.aka,
      email: user.email,
      country: user.country,
      privilege: user.privileges,
      userpage: user.userpage,
      notes: user.notes,
      badges: [...user.badges]
    };
    bypass = user.bypassHwid;
    whitelist = user.whitelistModes;
  });

  const now = () => Date.now() / 1000;

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

  const slots = [0, 1, 2, 3, 4, 5];

  const whitelistCount = (modes: number) =>
    [0, 1, 2].reduce(
      (total, rx) =>
        total +
        [0, 1, 2, 3].filter((mode) => allowed(mode, rx) && modes & (1 << (mode + rx * 4))).length,
      0
    );
</script>

{#if detail.state.status === 'error'}
  <a class="back" href="/admin/users"><i class="fa-solid fa-arrow-left"></i>Users</a>
  <p class="panel empty-note">{describe(detail.state.error)}</p>
{:else if detail.state.status === 'loading' && !form}
  <span class="skel" style="width: 100%; height: 140px"></span>
{:else if detail.state.status === 'ready' && form}
  {@const { user, groups, badgeChoices, banLogs, hwidCount, canViewIps, callerPrivileges } =
    detail.state.data}
  {@const banned = user.privileges === 0}
  {@const restricted = !banned && !(user.privileges & Privilege.Public)}
  {@const supporter = !!(user.privileges & Privilege.Donor)}
  {@const canManagePrivileges = !!(callerPrivileges & Privilege.AdminManagePrivilege)}
  {@const can = (flag: number) => !!(callerPrivileges & flag)}

  <a class="back" href="/admin/users"><i class="fa-solid fa-arrow-left"></i>Users</a>

  <section class="panel user-summary c-blue">
    <Avatar id={user.id} />
    <div>
      <h1>
        {user.username}
        {#if user.online}<span class="online-dot" title="Online"></span>{/if}
      </h1>
      <div class="meta">
        <span><Flag country={user.country} /> {countryName(user.country, 'en')}</span>
        <span><i class="fa-solid fa-hashtag"></i>{user.id}</span>
        <span>
          <i class="fa-solid fa-clock"></i>
          {user.lastSeen ? `Seen ${timeAgo(user.lastSeen)}` : 'Never seen'}
        </span>
        {#if user.previousNames.length}
          <span>
            <i class="fa-solid fa-signature"></i>Previously {user.previousNames.join(', ')}
          </span>
        {/if}
      </div>
      <div class="tags">
        <AdminTag colour={user.group.colour}>{user.group.name}</AdminTag>
        {#if banned}<AdminTag colour="c-red">Banned</AdminTag>{/if}
        {#if restricted}<AdminTag colour="c-orange">Restricted</AdminTag>{/if}
        {#if user.frozen}<AdminTag colour="c-lblue">Frozen</AdminTag>{/if}
        {#if user.silenceEnd > now()}
          <AdminTag colour="c-purple">Silenced until {fullDate(user.silenceEnd)}</AdminTag>
        {/if}
        {#if supporter && user.donorExpire}
          <AdminTag colour="c-yellow">Supporter until {fullDate(user.donorExpire)}</AdminTag>
        {/if}
        {#if whitelistCount(user.whitelistModes)}
          <AdminTag colour="c-green">
            Whitelisted in {whitelistCount(user.whitelistModes)}
            {whitelistCount(user.whitelistModes) === 1 ? 'mode' : 'modes'}
          </AdminTag>
        {/if}
      </div>
    </div>
    <a class="btn" href="/users/{user.id}">
      <i class="fa-solid fa-arrow-up-right-from-square"></i>View profile
    </a>
  </section>

  <div class="admin-grid">
    <div>
      <SectionTitle colour="c-blue" icon="fa-user-pen">Profile</SectionTitle>
      <form class="panel form-panel admin-form c-blue" onsubmit={save}>
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
        <div class="field">
          <span class="label">Badges</span>
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
        <div class="field">
          <label for="userpage">Userpage <span class="faint">(BBCode)</span></label>
          <textarea id="userpage" rows="6" bind:value={form.userpage}></textarea>
        </div>
        <div class="field">
          <label for="notes">Admin notes</label>
          <textarea id="notes" rows="3" bind:value={form.notes}></textarea>
          <small>Only staff can see these.</small>
        </div>
        {#if canViewIps}
          <div class="field">
            <span class="label">Last known IP</span>
            <div class="ip-box">
              <code>{user.ip ?? 'None'}</code>
              {#if user.ip}
                <button
                  type="button"
                  title="Other accounts that used this IP"
                  onclick={() => (ipOpen = true)}
                >
                  Lookup
                </button>
              {/if}
              <button
                type="button"
                title="Every IP this user has logged in from"
                onclick={() => (allIpsOpen = true)}
              >
                All IPs
              </button>
            </div>
          </div>
        {/if}
        <div class="form-actions">
          <button class="btn btn-green" type="submit" disabled={saving}>
            <i class="fa-solid fa-floppy-disk"></i>Save changes
          </button>
        </div>
      </form>

      <SectionTitle colour="c-red" icon="fa-gavel">Ban log</SectionTitle>
      <ol class="timeline">
        {#each banLogs as entry (`${entry.ts}-${entry.summary}`)}
          <li class="c-red">
            <div class="timeline-head">
              <b>{entry.from_name}</b>
              {entry.summary.toLowerCase()}
              <b>{user.username}</b><time>{timeAgo(entry.ts)}</time>
            </div>
            <p>{entry.detail}</p>
          </li>
        {/each}
        <li class="c-green">
          <div class="timeline-head">
            <b>{user.username}</b> joined RealistikOsu<time>{fullDate(user.registered)}</time>
          </div>
        </li>
      </ol>
    </div>

    <aside>
      <SectionTitle colour="c-orange" icon="fa-gavel">Moderation</SectionTitle>
      <div class="panel side-actions c-orange">
        <p class="state">
          {#if banned}
            <i class="fa-solid fa-ban"></i>Banned
          {:else if restricted}
            <i class="fa-solid fa-circle-exclamation"></i>Restricted
          {:else if user.frozen}
            <i class="fa-solid fa-snowflake"></i>Frozen
          {:else}
            <i class="fa-solid fa-circle-check"></i>In good standing
          {/if}
        </p>
        {#if user.banReason && (banned || restricted)}<p class="muted">{user.banReason}</p>{/if}
        <textarea
          id="reason"
          rows="2"
          placeholder="Reason, shown in the ban log"
          aria-label="Reason"
          bind:value={reason}></textarea>
        <div class="split">
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
                run({ action: 'ban', reason }, banned ? 'Account unbanned.' : 'Account banned.')}
            >
              {banned ? 'Unban' : 'Ban'}
            </button>
          {/if}
        </div>
        <div class="split">
          {#if can(Privilege.AdminManageUsers)}
            <button
              class="btn"
              type="button"
              onclick={() =>
                run({ action: 'freeze' }, user.frozen ? 'Account unfrozen.' : 'Account frozen.')}
            >
              <i class="fa-solid fa-snowflake"></i>{user.frozen ? 'Unfreeze' : 'Freeze'}
            </button>
          {/if}
          {#if can(Privilege.AdminKickUsers)}
            <button
              class="btn"
              type="button"
              onclick={() => run({ action: 'kick' }, 'Kicked from Bancho.')}
            >
              <i class="fa-solid fa-plug-circle-xmark"></i>Kick
            </button>
          {/if}
        </div>
        <hr />
        <nav class="action-list">
          <button type="button" onclick={() => (dialog = 'rename')}>
            <i class="fa-solid fa-tag"></i>Rename user
          </button>
          <button type="button" onclick={() => (dialog = 'password')}>
            <i class="fa-solid fa-key"></i>Change password
          </button>
          <button type="button" onclick={() => (dialog = 'supporter')}>
            <i class="fa-solid fa-heart"></i>Supporter
          </button>
        </nav>
      </div>

      <SectionTitle colour="c-green" icon="fa-shield">Whitelist</SectionTitle>
      <div class="panel whitelist c-green">
        <p class="muted">Skips the automatic checks for the modes you turn on.</p>
        <div class="whitelist-grid">
          <span></span>
          {#each modeNames as name, mode (mode)}
            <span><img src="/img/modes/mode-{mode}.png" alt={name} title={name} /></span>
          {/each}
          {#each relaxNames as rxName, rx (rx)}
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
          Save
        </button>
      </div>

      <SectionTitle colour="c-teal" icon="fa-microchip">Hardware</SectionTitle>
      <div class="panel hardware c-teal">
        <button class="hwid-count" type="button" onclick={() => (hwidOpen = true)}>
          <b>{hwidCount}</b>
          <span>HWID logs</span>
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
      </div>

      <details class="danger-zone">
        <summary>
          <i class="fa-solid fa-triangle-exclamation"></i>Danger zone<i
            class="fa-solid fa-chevron-down"
          ></i>
        </summary>
        <nav class="action-list">
          {#if can(Privilege.AdminWipeUsers)}
            <button type="button" onclick={() => (dialog = 'rollback')}>
              <i class="fa-solid fa-clock-rotate-left"></i>Roll back scores
            </button>
            <button type="button" onclick={() => (dialog = 'wipe-profile-comments')}>
              <i class="fa-solid fa-comment-slash"></i>Wipe comments on their profile
            </button>
            <button type="button" onclick={() => (dialog = 'wipe-their-comments')}>
              <i class="fa-solid fa-comments"></i>Wipe comments they wrote
            </button>
          {/if}
          <button type="button" onclick={() => (dialog = 'reset-avatar')}>
            <i class="fa-solid fa-image"></i>Reset avatar
          </button>
          <button type="button" onclick={() => (dialog = 'clear-hwid')}>
            <i class="fa-solid fa-microchip"></i>Clear HWID matches
          </button>
          {#if can(Privilege.PanelManageClans)}
            <button type="button" onclick={() => (dialog = 'kick-clan')}>
              <i class="fa-solid fa-shield-halved"></i>Kick from their clan
            </button>
          {/if}
          {#if can(Privilege.AdminWipeUsers)}
            <button type="button" onclick={() => (dialog = 'wipe')}>
              <i class="fa-solid fa-eraser"></i>Wipe account
            </button>
          {/if}
          <button type="button" onclick={() => (dialog = 'delete')}>
            <i class="fa-solid fa-trash-can"></i>Delete account
          </button>
        </nav>
      </details>
    </aside>
  </div>

  <UserDialogs {user} bind:open={dialog} {run} />
  <HwidDialog bind:open={hwidOpen} userId={user.id} />
  <IpDialog bind:open={ipOpen} title="Accounts on {user.ip}" userId={user.id} ip={user.ip} />
  <IpDialog bind:open={allIpsOpen} title="Every IP {user.username} has used" userId={user.id} />
{/if}
