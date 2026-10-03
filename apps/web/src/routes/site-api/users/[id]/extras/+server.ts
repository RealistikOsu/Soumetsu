import { optionalCaller } from '$server/auth';
import { isOnline } from '$server/admin/bancho';
import { db } from '$server/db';
import { Failure, handle, ok } from '$server/respond';

const PUBLIC = 1;
const MANAGE_USERS = 16;

interface StatsExtras {
  username_aka: string;
  favourite_mode: number;
  play_style: number;
  custom_badge_icon: string | null;
  custom_badge_name: string | null;
  show_custom_badge: number;
  can_custom_badge: number;
}

// Only supporters have a banner. An uploaded picture is the default for them, a solid colour when they
// chose one, and nothing when they chose none.
function bannerOf(privileges: number, row: { type: number; value: string } | null) {
  if ((privileges & 4) === 0) return null;
  if (!row) return null;
  if (row.type === 1) return { type: 1, value: null };
  return row.type === 2 ? { type: 2, value: row.value } : null;
}

export const GET = handle(async ({ params, request }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw new Failure(404, 'users.user_not_found');

  const [user, caller] = await Promise.all([
    db.users.findUnique({
      where: { id },
      select: {
        privileges: true,
        frozen: true,
        silence_end: true,
        silence_reason: true,
        disabled_comments: true,
        name_decoration: true
      }
    }),
    optionalCaller(request)
  ]);
  if (!user) throw new Failure(404, 'users.user_not_found');

  const privileges = Number(user.privileges);
  const visible =
    (privileges & PUBLIC) !== 0 ||
    caller?.id === id ||
    (caller !== null && (caller.privileges & MANAGE_USERS) !== 0);
  if (!visible) return ok({ visibility: 'hidden' });

  const [stats, banner, bancho, names, badges, comments, rankedSets, mappedSets] =
    await Promise.all([
      db.$queryRaw<StatsExtras[]>`
      SELECT username_aka, favourite_mode, play_style, custom_badge_icon,
             custom_badge_name, show_custom_badge, can_custom_badge
      FROM users_stats WHERE id = ${id}`,
      db.profile_backgrounds.findUnique({ where: { uid: id } }),
      db.osu_official_links.findUnique({ where: { osu_user_id: id } }),
      db.user_name_history.findMany({
        where: { user_id: id },
        orderBy: { replaced_at: 'desc' },
        select: { username: true }
      }),
      db.$queryRaw<{ name: string; icon: string }[]>`
      SELECT b.name, b.icon FROM user_badges ub
      INNER JOIN badges b ON b.id = ub.badge WHERE ub.user = ${id} ORDER BY b.id`,
      db.$queryRaw<
        { total: bigint }[]
      >`SELECT COUNT(*) AS total FROM user_comments WHERE prof = ${id}`,
      // Sets this player ranked or loved that still have that status, and sets they uploaded here.
      db.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(DISTINCT b.beatmapset_id) AS total FROM beatmap_rankers r
      INNER JOIN beatmaps b ON b.beatmap_id = r.beatmap_id AND b.ranked = r.status
      WHERE r.user_id = ${id}`,
      db.$queryRaw<{ total: bigint }[]>`
      SELECT COUNT(DISTINCT beatmapset_id) AS total FROM beatmaps
      WHERE beatmapset_id >= 1000000000 AND mapper_id = ${id} AND ranked != -1`
    ]);
  const extras = stats[0];
  const now = Math.floor(Date.now() / 1000);

  return ok({
    visibility: 'visible',
    online: await isOnline(id),
    nameDecoration: user.name_decoration || null,
    frozen: user.frozen !== 0,
    silence: user.silence_end > now ? { end: user.silence_end, reason: user.silence_reason } : null,
    commentsDisabled: user.disabled_comments !== 0,
    usernameAka: extras?.username_aka ?? '',
    favouriteMode: extras?.favourite_mode ?? 0,
    playStyle: extras?.play_style ?? 0,
    customBadge:
      extras && extras.show_custom_badge
        ? { icon: extras.custom_badge_icon ?? '', name: extras.custom_badge_name ?? '' }
        : null,
    banner: bannerOf(privileges, banner),
    bancho: bancho ? { id: Number(bancho.ppy_user_id), username: bancho.ppy_username } : null,
    pastNames: names.map((n) => n.username),
    badges,
    commentCount: Number(comments[0]?.total ?? 0),
    rankedSets: Number(rankedSets[0]?.total ?? 0),
    mappedSets: Number(mappedSets[0]?.total ?? 0)
  });
});
