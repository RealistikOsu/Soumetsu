import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { casinoConfigRows, saveCasinoConfig } from '$server/casino/admin';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  await requirePrivilege(request, Privilege.AdminManageSetting);
  return ok(await casinoConfigRows());
});

export const PUT = handle(async ({ request }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageSetting);
  await saveCasinoConfig(caller.id, await request.json().catch(() => null));
  return ok(await casinoConfigRows());
});
