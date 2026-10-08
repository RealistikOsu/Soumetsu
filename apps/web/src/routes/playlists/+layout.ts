import { error } from '@sveltejs/kit';

// Playlists are switched off until there's a plan for them. Delete this file to bring the pages back.
export function load() {
  error(404);
}
