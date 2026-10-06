import { config } from '$server/config';
import { redis } from '$server/redis';

export const kick = (userId: number, reason: string) =>
  redis.publish('peppy:disconnect', JSON.stringify({ userID: userId, reason }));

export async function isOnline(userId: number) {
  const response = await fetch(`${config.banchoUrl}/api/status/${userId}`, {
    signal: AbortSignal.timeout(1500)
  }).catch(() => null);
  return response?.status === 200;
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
      ...(country && country !== 'XX' ? [`${board}:${mode}:${country}`] : [])
    ])
  );
  await Promise.all(keys.map((key) => redis.zrem(key, userId)));
}
