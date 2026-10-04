import { Privilege } from '$lib/auth/privileges';
import { passwordProblem } from '$lib/passwords';
import { requirePrivilege } from '$server/auth';
import { kick } from '$server/admin/bancho';
import { bodyOf, idOf } from '$server/admin/common';
import { rapLog } from '$server/admin/log';
import * as users from '$server/admin/users';
import { db } from '$server/db';
import { redis } from '$server/redis';
import { Failure, handle, ok } from '$server/respond';

// Vanilla has all four modes, relax has no mania and autopilot is osu! only.
const WHITELIST_MODES = 0b1_0111_1111;
const RELAX_NAMES = ['vanilla', 'relax', 'autopilot'];
const MODE_NAMES = ['osu!', 'taiko', 'catch', 'mania'];

const describeModes = (modes: number) =>
  [0, 1, 2]
    .flatMap((rx) =>
      [0, 1, 2, 3]
        .filter((mode) => modes & (1 << (mode + rx * 4)))
        .map((mode) => `${RELAX_NAMES[rx]} ${MODE_NAMES[mode]}`)
    )
    .join(', ');

interface Body {
  action: string;
  reason: string;
  note: string;
  username: string;
  keepHistory: boolean;
  password: string;
  days: number;
  modes: number[];
  types: string[];
  confirm: string;
  bypass: boolean;
  whitelist: number;
}

// What each action needs, matching the privilege the old panel's route for it asked for.
const NEEDS: Record<string, number> = {
  restrict: Privilege.AdminManageUsers,
  freeze: Privilege.AdminManageUsers,
  rename: Privilege.AdminManageUsers,
  password: Privilege.AdminManageUsers,
  supporter: Privilege.AdminManageUsers,
  'remove-supporter': Privilege.AdminManageUsers,
  whitelist: Privilege.AdminManageUsers,
  'hwid-bypass': Privilege.AdminManageUsers,
  'reset-avatar': Privilege.AdminManageUsers,
  'clear-hwid': Privilege.AdminManageUsers,
  delete: Privilege.AdminManageUsers,
  ban: Privilege.AdminBanUsers,
  kick: Privilege.AdminKickUsers,
  wipe: Privilege.AdminWipeUsers,
  rollback: Privilege.AdminWipeUsers,
  'wipe-profile-comments': Privilege.AdminWipeUsers,
  'wipe-their-comments': Privilege.AdminWipeUsers,
  'kick-clan': Privilege.PanelManageClans
};

export const POST = handle(async ({ request, params }) => {
  const body = await bodyOf<Body>(request);
  const flag = NEEDS[body.action ?? ''];
  if (!flag) throw new Failure(400, 'auth.validation_error');

  const caller = await requirePrivilege(request, flag);
  const id = idOf(params);
  const name = await users.nameOf(id);
  const who = `${name} (${id})`;
  const reason = (body.reason ?? '').trim();
  // The ban log's detail column holds this many.
  if (reason.length > 2048)
    throw new Failure(400, 'The reason is too long, keep it under 2048 characters.');

  switch (body.action) {
    case 'restrict': {
      const restricted = await users.toggleRestrict(
        id,
        caller.id,
        reason,
        (body.note ?? '').trim()
      );
      await rapLog(
        caller.id,
        `has ${restricted ? 'restricted' : 'unrestricted'} the account ${who}`
      );
      break;
    }
    case 'ban': {
      const banned = await users.toggleBan(id, caller.id, reason);
      await rapLog(caller.id, `has ${banned ? 'banned' : 'unbanned'} the account ${who}`);
      break;
    }
    case 'freeze': {
      const frozen = await users.toggleFreeze(id);
      await rapLog(caller.id, `has ${frozen ? 'frozen' : 'unfrozen'} the account ${who}`);
      break;
    }
    case 'kick':
      await kick(id, 'You have been kicked by an admin!');
      await rapLog(caller.id, `has kicked the account ${who}`);
      break;
    case 'rename': {
      const error = await users.rename(id, caller.id, body.username ?? '', !body.keepHistory);
      if (error) throw new Failure(400, error);
      break;
    }
    case 'password': {
      const password = body.password ?? '';
      if (await passwordProblem(password)) throw new Failure(400, 'auth.validation_error');
      await users.changePassword(id, password);
      await rapLog(caller.id, `has changed the password of ${who}`);
      break;
    }
    case 'supporter': {
      const days = Math.floor(Number(body.days));
      if (!(days > 0)) throw new Failure(400, 'auth.validation_error');
      await users.addSupporter(id, days);
      await rapLog(caller.id, `has awarded ${who} ${days} days of donor.`);
      break;
    }
    case 'remove-supporter':
      if (await users.removeSupporter(id)) {
        await rapLog(caller.id, `deleted the supporter role for ${who}`);
      }
      break;
    case 'whitelist': {
      // One bit per mode the score server may skip its checks in: bit (mode + relax * 4).
      const modes = Number(body.whitelist) & WHITELIST_MODES;
      if (modes === 0) {
        await db.whitelist.deleteMany({ where: { user_id: id } });
        await rapLog(caller.id, `removed ${who} from the whitelist`);
      } else {
        await db.whitelist.upsert({
          where: { user_id: id },
          create: { user_id: id, modes },
          update: { modes }
        });
        await rapLog(caller.id, `set ${who}'s whitelist to ${describeModes(modes)}`);
      }
      break;
    }
    case 'hwid-bypass':
      await db.users.update({ where: { id }, data: { bypass_hwid: !!body.bypass } });
      break;
    case 'reset-avatar':
      await users.resetAvatar(id, request.headers.get('Authorization') ?? '');
      break;
    case 'clear-hwid':
      await db.hw_user.deleteMany({ where: { userid: id } });
      await rapLog(caller.id, `has cleared the HWID matches for the account ${who}`);
      break;
    case 'wipe': {
      const scope = users.parseScope(body);
      await users.wipeStats(id, scope);
      const everything = scope.modes.length === 4 && scope.types.length === 3;
      await rapLog(
        caller.id,
        everything
          ? `has wiped the account ${who}`
          : `has partially wiped (modes: [${scope.modes}], mods: [${scope.types}]) the account ${who}`
      );
      break;
    }
    case 'rollback': {
      const days = Math.floor(Number(body.days));
      if (!(days > 0)) throw new Failure(400, 'auth.validation_error');
      await users.rollback(id, days, users.parseScope(body));
      await rapLog(caller.id, `has rolled back the account ${who} by ${days} days`);
      break;
    }
    case 'wipe-profile-comments':
      await db.user_comments.deleteMany({ where: { prof: id } });
      await rapLog(caller.id, `has removed all comments made on ${name}'s profile (${id})`);
      break;
    case 'wipe-their-comments':
      await db.user_comments.deleteMany({ where: { op: id } });
      await rapLog(caller.id, `has removed all comments made by ${who}`);
      break;
    case 'kick-clan':
      await db.user_clans.deleteMany({ where: { user: id } });
      await redis.publish('rosu:clan_update', String(id));
      break;
    case 'delete':
      if (body.confirm !== name) throw new Failure(400, 'auth.validation_error');
      await users.deleteAccount(id, request.headers.get('Authorization') ?? '');
      await rapLog(caller.id, `has deleted (anonymised) the account ${who}`);
      break;
  }
  return ok();
});
