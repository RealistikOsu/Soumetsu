import { onUnauthorised } from '$lib/api/client';
import { isApiError } from '$lib/api/errors';
import { login, logout, me, type UserProfile } from '$lib/api/users';
import { flash } from '$lib/flash.svelte';
import { clearToken, getToken, setToken } from './token';

class Session {
  user = $state.raw<UserProfile | null>(null);
  ready = $state(false);

  async start() {
    if (getToken()) {
      try {
        this.user = await me();
      } catch (error) {
        // A 401 has already cleared the token. Anything else (API down) leaves it alone so a refresh can recover.
        if (!isApiError(error)) throw error;
      }
    }
    this.ready = true;
  }

  async login(username: string, password: string, captcha?: string) {
    const result = await login(username, password, captcha);
    setToken(result.token);
    this.user = await me();
  }

  async logout() {
    await logout().catch(() => null);
    this.expire();
  }

  expire() {
    clearToken();
    this.user = null;
  }
}

export const session = new Session();

onUnauthorised(() => {
  session.expire();
  flash.show('warning', 'Your session has expired. Please log in again.');
});
