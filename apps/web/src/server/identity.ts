import { createHash, randomBytes } from 'node:crypto';
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { db } from './db';

const COOKIE = 'y';
const SIX_MONTHS = 60 * 60 * 24 * 30 * 6;

export const clientIp = (event: Pick<RequestEvent, 'request' | 'getClientAddress'>) =>
  event.request.headers.get('X-Real-IP') ?? event.getClientAddress();

export const md5 = (value: string) => createHash('md5').update(value).digest('hex');

// The identity cookie recognises a browser across sessions, for verification and multiaccount checks.
export async function setIdentity(userId: number, cookies: Cookies) {
  let token = (await db.identity_tokens.findUnique({ where: { userid: userId } }))?.token;
  if (!token) {
    token = createHash('sha256').update(randomBytes(32)).digest('hex');
    await db.identity_tokens.create({ data: { userid: userId, token } });
  }
  cookies.set(COOKIE, token, { path: '/', maxAge: SIX_MONTHS, httpOnly: true, sameSite: 'lax' });
}

export const identityOf = (cookies: Cookies) => cookies.get(COOKIE) ?? '';

export async function logIp(userId: number, ip: string) {
  await db.$executeRaw`
    INSERT INTO ip_user (userid, ip, occurencies) VALUES (${userId}, ${ip}, 1)
    ON DUPLICATE KEY UPDATE occurencies = occurencies + 1`;
}
