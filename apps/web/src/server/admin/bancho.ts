import { config } from '$server/config';
import { siteOnline } from '$server/presence';
import { redis } from '$server/redis';

export const kick = (userId: number, reason: string) =>
  redis.publish('peppy:disconnect', JSON.stringify({ userID: userId, reason }));

export async function banchoOnline(userId: number) {
  const response = await fetch(`${config.banchoUrl}/api/status/${userId}`, {
    signal: AbortSignal.timeout(1500)
  }).catch(() => null);
  return response?.status === 200;
}

// In game or on the site.
export async function isOnline(userId: number) {
  const [bancho, site] = await Promise.all([banchoOnline(userId), siteOnline(userId)]);
  return bancho || site;
}

const MODES = ['std', 'ctb', 'mania', 'taiko'];
const BOARDS = [
  'ripple:leaderboard',
  'ripple:leaderboard_relax',
  'ripple:leaderboard_ap',
  'ripple:leaderboard_lazer',
  'ripple:leaderboard_lazer_relax',
  'ripple:leaderboard_lazer_ap'
];

// Takes a player off every leaderboard Bancho keeps for them, country boards included.
export async function removeFromLeaderboards(userId: number, country: string | null) {
  const keys = MODES.flatMap((mode) =>
    BOARDS.flatMap((board) => [
      `${board}:${mode}`,
      ...(country && country !== 'XX' ? [`${board}:${mode}:${country.toLowerCase()}`] : [])
    ])
  );
  await Promise.all(keys.map((key) => redis.zrem(key, userId)));
}

const SCOPE_BOARDS = {
  va: ['ripple:leaderboard'],
  rx: ['ripple:leaderboard_relax'],
  ap: ['ripple:leaderboard_ap'],
  lz: ['ripple:leaderboard_lazer', 'ripple:leaderboard_lazer_relax', 'ripple:leaderboard_lazer_ap']
} as const;
const BOARD_MODES = ['std', 'taiko', 'ctb', 'mania'];

// Only the boards a wipe covers, so wiping one custom mode leaves the others ranked.
export async function removeFromScopeLeaderboards(
  userId: number,
  country: string | null,
  { modes, types }: { modes: number[]; types: (keyof typeof SCOPE_BOARDS)[] }
) {
  const keys = types.flatMap((type) =>
    SCOPE_BOARDS[type].flatMap((board) =>
      modes.flatMap((mode) => [
        `${board}:${BOARD_MODES[mode]}`,
        ...(country && country !== 'XX'
          ? [`${board}:${BOARD_MODES[mode]}:${country.toLowerCase()}`]
          : [])
      ])
    )
  );
  await Promise.all(keys.map((key) => redis.zrem(key, userId)));
}
