import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { bodyOf } from '$server/admin/common';
import { rapLog } from '$server/admin/log';
import { db } from '$server/db';
import { handle, ok } from '$server/respond';

export const GET = handle(async ({ request }) => {
  await requirePrivilege(request, Privilege.AdminManageServer);
  const rows = await db.bancho_settings.findMany({
    where: { name: { in: ['bancho_maintenance', 'menu_icon', 'login_notification'] } }
  });
  const row = (name: string) => rows.find((r) => r.name === name);

  return ok({
    maintenance: !!row('bancho_maintenance')?.value_int,
    menuIcon: row('menu_icon')?.value_string ?? '',
    loginNotification: row('login_notification')?.value_string ?? ''
  });
});

interface Body {
  maintenance: boolean;
  menuIcon: string;
  loginNotification: string;
}

export const PUT = handle(async ({ request }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageServer);
  const body = await bodyOf<Body>(request);

  const text = (name: string, value: string | undefined) =>
    db.bancho_settings.updateMany({
      where: { name },
      data: { value_string: value ?? '', value_int: value ? 1 : 0 }
    });

  await text('menu_icon', body.menuIcon?.trim());
  await text('login_notification', body.loginNotification?.trim());
  await db.bancho_settings.updateMany({
    where: { name: 'bancho_maintenance' },
    data: { value_int: Number(!!body.maintenance) }
  });

  await rapLog(caller.id, 'modified the bancho settings');
  return ok();
});
