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
      const listed = await db.whitelist.findUnique({ where: { user_id: id } });
      if (listed) {
        await db.whitelist.delete({ where: { user_id: id } });
        await rapLog(caller.id, `removed ${id} from the whitelist`);
      } else {
        await db.whitelist.create({ data: { user_id: id } });
        await rapLog(caller.id, `added ${id} to the whitelist`);
      }
      break;
    }
    case 'hwid-bypass':
      await db.users.update({ where: { id }, data: { bypass_hwid: !!body.bypass } });
      break;
    case 'reset-avatar':
      if (await users.resetAvatar(id)) await rapLog(caller.id, `reset avatar for user ${id}`);
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
      await users.deleteAccount(id);
      await rapLog(caller.id, `has deleted the account ${who}`);
      break;
  }
  return ok();
});
