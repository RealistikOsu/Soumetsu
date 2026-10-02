import { db } from '$server/db';
import { identityOf } from '$server/identity';
import { Failure, handle, ok } from '$server/respond';

const NORMAL = 2;
const PENDING_VERIFICATION = 1 << 20;

// Where a new account stands, for the verify and welcome pages. Only the browser that registered it can ask.
export const GET = handle(async ({ url, cookies }) => {
  const id = Number(url.searchParams.get('u'));
  const token = identityOf(cookies);
  const owned =
    Number.isInteger(id) && token
      ? await db.identity_tokens.findFirst({ where: { userid: id, token } })
      : null;
  if (!owned) throw new Failure(403, 'site.forbidden');

  const user = await db.users.findUnique({ where: { id }, select: { privileges: true } });
  if (!user) throw new Failure(404, 'users.user_not_found');

  const privileges = Number(user.privileges);
  if (privileges & PENDING_VERIFICATION) return ok('pending');
  // Without the normal bit a verified account was banned, which means it multiaccounted.
  return ok((privileges & NORMAL) === 0 ? 'banned' : 'active');
});
