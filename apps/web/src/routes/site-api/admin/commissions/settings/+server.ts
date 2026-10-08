import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { bodyOf } from '$server/admin/common';
import { loadSettings, saveSettings } from '$server/commissions/settings';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  await requirePrivilege(request, Privilege.AdminManageSetting);
  return ok(await loadSettings());
});

export const PUT = handle(async ({ request }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageSetting);
  return ok(await saveSettings(caller.id, await bodyOf<unknown>(request)));
});
