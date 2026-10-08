import { Failure } from '$server/respond';
import { instantGames } from './games/registry';
import type { InstantGame } from './games/registry';

export function instantEntry(game: string) {
  if (!Object.hasOwn(instantGames, game)) throw new Failure(404, 'site.invalid_request');
  return instantGames[game as InstantGame];
}
