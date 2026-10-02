import { Privilege } from '$lib/auth/privileges';
import { requirePrivilege } from '$server/auth';
import { bodyOf } from '$server/admin/common';
import { rapLog } from '$server/admin/log';
import { db } from '$server/db';
import { handle, ok } from '$server/respond';

const NAMES = [
  'website_maintenance',
  'game_maintenance',
  'registrations_enabled',
  'website_global_alert',
  'website_home_alert'
];

export const GET = handle(async ({ request }) => {
  await requirePrivilege(request, Privilege.AdminManageSetting);
  const rows = await db.system_settings.findMany({ where: { name: { in: NAMES } } });
  const row = (name: string) => rows.find((r) => r.name === name);

  return ok({
    websiteMaintenance: !!row('website_maintenance')?.value_int,
    gameMaintenance: !!row('game_maintenance')?.value_int,
    registrations: !!row('registrations_enabled')?.value_int,
    globalAlert: row('website_global_alert')?.value_string ?? '',
    homeAlert: row('website_home_alert')?.value_string ?? ''
  });
});

interface Body {
  websiteMaintenance: boolean;
  gameMaintenance: boolean;
  registrations: boolean;
  globalAlert: string;
  homeAlert: string;
}

// An empty alert switches that alert off, like the panel did.
export const PUT = handle(async ({ request }) => {
  const caller = await requirePrivilege(request, Privilege.AdminManageSetting);
  const body = await bodyOf<Body>(request);

  const set = (name: string, value_int: number, value_string?: string) =>
    db.system_settings.updateMany({
      where: { name },
      data: value_string === undefined ? { value_int } : { value_int, value_string }
    });
  const alert = (text: string | undefined) => (text ?? '').trim();

  await set('website_maintenance', Number(!!body.websiteMaintenance));
  await set('game_maintenance', Number(!!body.gameMaintenance));
  await set('registrations_enabled', Number(!!body.registrations));
  await set('website_global_alert', Number(!!alert(body.globalAlert)), alert(body.globalAlert));
  await set('website_home_alert', Number(!!alert(body.homeAlert)), alert(body.homeAlert));

  await rapLog(caller.id, 'updated the system settings.');
  return ok();
});
