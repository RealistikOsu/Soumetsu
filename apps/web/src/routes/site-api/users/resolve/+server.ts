import { Failure, handle, ok } from '$server/respond';
import { resolveUser } from '$server/users';

export const GET = handle(async ({ url }) => {
  const name = url.searchParams.get('name')?.trim();
  if (!name) throw new Failure(400, 'site.invalid_request');

  const id = await resolveUser(name);
  if (id === null) throw new Failure(404, 'users.user_not_found');
  return ok(id);
});
