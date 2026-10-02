import { config } from './config';
import { db } from './db';
import { Failure } from './respond';

export interface Caller {
  id: number;
  privileges: number;
}

async function sessionUserId(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) return null;

  const response = await fetch(`${config.apiUrl}/api/v2/auth/session`, {
    headers: { Authorization: authorization }
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { data: { user_id: number } };
  return body.data.user_id;
}

// The session's privileges are a snapshot from login, so they are read again from the database.
export async function privilegesOf(id: number) {
  const user = await db.users.findUnique({ where: { id }, select: { privileges: true } });
  return user ? Number(user.privileges) : 0;
}

export async function optionalCaller(request: Request): Promise<Caller | null> {
  const id = await sessionUserId(request);
  return id === null ? null : { id, privileges: await privilegesOf(id) };
}

export async function requireCaller(request: Request): Promise<Caller> {
  const caller = await optionalCaller(request);
  if (!caller) throw new Failure(401, 'auth.unauthenticated');
  return caller;
}

// Staff routes check the same bit the panel's requires_privilege did, read fresh from the database.
export async function requirePrivilege(request: Request, flag: number) {
  const caller = await requireCaller(request);
  if ((caller.privileges & flag) !== flag) throw new Failure(403, 'site.forbidden');
  return caller;
}
