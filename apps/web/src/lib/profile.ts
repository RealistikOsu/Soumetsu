import { getContext, setContext } from 'svelte';
import type { UserExtras } from '$lib/api/site';
import type { UserProfile } from '$lib/api/users';

// The profile header and its pages (scores, multiplayer, ranked play) share what the header loaded.
export interface ProfileContext {
  readonly id: number;
  readonly extra: UserExtras | null;
  readonly base: UserProfile | null;
  readonly own: boolean;
}

const key = Symbol('profile');

export const setProfile = (context: ProfileContext) => setContext(key, context);
export const getProfile = () => getContext<ProfileContext>(key);
