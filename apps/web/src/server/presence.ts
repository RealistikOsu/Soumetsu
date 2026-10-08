import { redis } from './redis';

// Someone with the site open counts as online. The header asks for unread messages every 30 seconds while the tab
// is in view, which is the heartbeat; the key outlives a missed one. Nothing here touches users.latest_activity.
const TTL = 90;

export const touchPresence = (userId: number) =>
  redis.set(`soumetsu:online:${userId}`, '1', 'EX', TTL);

export const siteOnline = async (userId: number) =>
  (await redis.exists(`soumetsu:online:${userId}`)) === 1;
