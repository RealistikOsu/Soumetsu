import { building } from '$app/environment';
import { taskText } from '$lib/commissions';
import { record } from '$server/admin/console';
import { config } from '$server/config';
import { db } from '$server/db';
import { redis } from '$server/redis';
import { recheckToday } from './service';

const CHANNEL = 'rosu:score_submitted';
// Scores tend to arrive in bursts (retries, a few maps back to back), so one check covers the lot.
const SETTLE = 3_000;
const NOTICE_TTL = 2 * 86_400;

const waiting = new Map<number, ReturnType<typeof setTimeout>>();

export function noticeLines(
  completed: {
    template: string;
    params: Record<string, string | number | boolean>;
    points: number;
  }[],
  tiers: { coins: number }[],
  points: number,
  top: number,
  url: string
) {
  return [
    ...completed.map(
      (task) => `Commission done: ${taskText(task)} (+${task.points} pts, ${points}/${top} today)`
    ),
    ...tiers.map((tier) => `${tier.coins} coins are ready to claim. [${url} Claim them here]`)
  ];
}

async function notify(userId: number) {
  const { day, completed, tiers } = await recheckToday(userId);
  if (!completed.length && !tiers.length) return;

  // The NX keys stop a second site instance, or a repeated check, from sending the same notice twice.
  const fresh = [];
  for (const task of completed) {
    const set = await redis.set(`commissions:notice:task:${task.id}`, '1', 'EX', NOTICE_TTL, 'NX');
    if (set === 'OK') fresh.push(task);
  }
  const freshTiers = [];
  for (const tier of tiers) {
    const key = `commissions:notice:tier:${userId}:${day.date}:${tier.points}`;
    if ((await redis.set(key, '1', 'EX', NOTICE_TTL, 'NX')) === 'OK') freshTiers.push(tier);
  }
  if (!fresh.length && !freshTiers.length) return;

  const user = await db.users.findUnique({ where: { id: userId }, select: { username: true } });
  if (!user) return;
  const top = day.thresholds.at(-1)?.points ?? 0;
  const lines = noticeLines(fresh, freshTiers, day.points, top, `${config.appBaseUrl}/commissions`);
  for (const message of lines) {
    await redis.publish('peppy:bot_msg', JSON.stringify({ target: user.username, message }));
  }
}

// Both score servers announce every submission here; Bancho delivers the bot messages to players on stable.
export function startCommissionNotices() {
  if (building) return;
  const subscriber = redis.duplicate();
  subscriber.on('error', (error) => console.error('commission notices', error));
  subscriber.on('message', (_, payload) => {
    let userId: number;
    try {
      userId = Number(JSON.parse(payload).user_id);
    } catch {
      return;
    }
    if (!Number.isInteger(userId) || userId <= 0) return;

    clearTimeout(waiting.get(userId));
    waiting.set(
      userId,
      setTimeout(() => {
        waiting.delete(userId);
        notify(userId).catch((error) => record('error', userId, error));
      }, SETTLE)
    );
  });
  subscriber.subscribe(CHANNEL);
}
