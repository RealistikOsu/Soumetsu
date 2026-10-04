import { onUnauthorised } from '$lib/api/client';
import { isApiError } from '$lib/api/errors';
import { userExtras } from '$lib/api/site';
import { loginWithCode, sessionInfo } from '$lib/api/twoFactor';
import { login, logout, me, type UserProfile } from '$lib/api/users';
import { flash } from '$lib/flash.svelte';
import { m } from '$lib/paraglide/messages';
import { clearToken, getToken, setToken } from './token';
import { isStaff, playerPrivileges } from './privileges';

class Session {
  user = $state.raw<UserProfile | null>(null);
  frozen = $state(false);
  ready = $state(false);
  // Staff whose login didn't pass two-factor: their staff privileges are held back until it does.
  needsTwoFactor = $state(false);

  async start() {
    if (getToken()) {
      try {
        await this.#load();
      } catch (error) {
        // A 401 has already cleared the token. Anything else (API down) leaves it alone so a refresh can recover.
        if (!isApiError(error)) throw error;
      }
    }
    this.ready = true;
  }

  // Returns the two-factor challenge when the account needs a code to finish logging in.
  async login(username: string, password: string, captcha?: string) {
    const result = await login(username, password, captcha);
    if (!result.token) return result.two_factor_challenge ?? null;
    setToken(result.token);
    await this.#load();
    return null;
  }

  async loginWithCode(challenge: string, code: string) {
    const result = await loginWithCode(challenge, code);
    if (result.token) setToken(result.token);
    await this.#load();
  }

  // Setting up two-factor upgrades the current session, so it's read again.
  async refresh() {
    await this.#load();
  }

  async logout() {
    await logout().catch(() => null);
    this.expire();
  }

  expire() {
    clearToken();
    this.user = null;
    this.frozen = false;
    this.needsTwoFactor = false;
  }

  async #load() {
    const [user, info] = await Promise.all([me(), sessionInfo()]);
    this.frozen = (await userExtras(user.id)).frozen;
    this.needsTwoFactor = isStaff(user.privileges) && !info.mfa;
    // The server holds staff privileges back the same way; masking them here keeps staff-only buttons hidden.
    this.user = info.mfa ? user : { ...user, privileges: playerPrivileges(user.privileges) };
  }
}

export const session = new Session();

onUnauthorised(() => {
  session.expire();
  flash.show('warning', m.auth_session_expired());
});
