import { requireCaller } from '$server/auth';
import { config } from '$server/config';
import { db } from '$server/db';
import { Failure, handle, ok } from '$server/respond';

const MAX_STAR_RATING = 20;
const MAX_COOLDOWN = 3600;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const GET = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const link = await db.twitch_links.findUnique({
    where: { osu_user_id: caller.id },
    include: { twitch_settings: true, twitch_excluded_users: true }
  });
  const configured = !!(config.twitch.id && config.twitch.secret);
  if (!link) return ok({ configured, link: null, settings: null });

  const settings = link.twitch_settings;
  // A star range of -1 / -1 is how the bot reads "off".
  const filter = !!settings && settings.sr_max >= 0;
  return ok({
    configured,
    link: { username: link.twitch_username },
    settings: {
      enabled: settings?.enabled ?? true,
      echo: settings?.echo ?? true,
      subOnly: settings?.sub_only ?? false,
      pointsOnly: settings?.points_only ?? false,
      cooldown: settings?.cooldown ?? 30,
      starFilter: filter,
      starMin: filter ? settings.sr_min : 0,
      starMax: filter ? settings.sr_max : MAX_STAR_RATING,
      excluded: link.twitch_excluded_users.map((user) => user.excluded_username)
    }
  });
});

export const PUT = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const link = await db.twitch_links.findUnique({ where: { osu_user_id: caller.id } });
  if (!link) throw new Failure(404, 'site.not_linked');

  const body = (await request.json().catch(() => null)) as {
    enabled?: boolean;
    echo?: boolean;
    subOnly?: boolean;
    pointsOnly?: boolean;
    cooldown?: number;
    starFilter?: boolean;
    starMin?: number;
    starMax?: number;
    excluded?: string;
  } | null;
  if (!body) throw new Failure(400, 'site.invalid_request');

  const cooldown = clamp(Math.trunc(Number(body.cooldown) || 0), 0, MAX_COOLDOWN);
  let min = -1;
  let max = -1;
  if (body.starFilter) {
    min = clamp(Number(body.starMin) || 0, 0, MAX_STAR_RATING);
    max = clamp(Number(body.starMax) || MAX_STAR_RATING, 0, MAX_STAR_RATING);
    // An inverted range would reject every map, so the ends are swapped.
    if (min > max) [min, max] = [max, min];
  }

  const names = [
    ...new Set(
      (body.excluded ?? '')
        .split(/[\n\r, \t]+/)
        .map((name) => name.trim().replace(/^@/, '').toLowerCase())
        .filter((name) => name && name.length <= 50)
    )
  ];

  const data = {
    enabled: !!body.enabled,
    echo: !!body.echo,
    sub_only: !!body.subOnly,
    points_only: !!body.pointsOnly,
    cooldown,
    sr_min: min,
    sr_max: max
  };
  await db.$transaction([
    db.twitch_settings.upsert({
      where: { twitch_id: link.twitch_id },
      create: { twitch_id: link.twitch_id, ...data },
      update: data
    }),
    db.twitch_excluded_users.deleteMany({ where: { twitch_id: link.twitch_id } }),
    db.twitch_excluded_users.createMany({
      data: names.map((name) => ({ twitch_id: link.twitch_id, excluded_username: name })),
      skipDuplicates: true
    })
  ]);
  return ok();
});

// Settings and exclusions go with the link.
export const DELETE = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  const removed = await db.twitch_links.deleteMany({ where: { osu_user_id: caller.id } });
  if (removed.count === 0) throw new Failure(404, 'site.not_linked');
  return ok();
});
