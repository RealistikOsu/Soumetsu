import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { handle, ok } from '$server/respond';
import { loadShopSettings, saveShopSettings } from '$server/shop/settings';

export const GET = handle(async ({ request }) => {
  await requirePrivilege(request, Privilege.AdminManageSetting);
  return ok(await loadShopSettings());
});

export const PUT = handle(async ({ request }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageSetting);
  const raw = await request.json().catch(() => null);
  return ok(await saveShopSettings(caller.id, raw));
});
