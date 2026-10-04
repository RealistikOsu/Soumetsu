import { requireCaller } from '$server/auth';
import { db } from '$server/db';
import { Failure, handle, ok } from '$server/respond';

const DONOR = 4;
const HEX = /^#([a-f0-9]{6}|[a-f0-9]{3})$/;

const within = (value: unknown, min: number, max: number) =>
  Number.isInteger(value) && (value as number) >= min && (value as number) <= max;

// Which kind of banner the profile shows. The picture itself is uploaded to the API, so this records the
// choice, and holds the colour for the solid kind. Banners are a supporter perk.
export const PUT = handle(async ({ request }) => {
  const caller = await requireCaller(request);
  if (!(caller.privileges & DONOR)) throw new Failure(403, 'site.supporter_only');

  const body = (await request.json().catch(() => null)) as {
    type?: number;
    value?: string;
    x?: number;
    y?: number;
    zoom?: number;
  } | null;
  const type = body?.type;
  if (type !== 0 && type !== 1 && type !== 2) throw new Failure(400, 'site.invalid_request');

  if (type === 0) {
    await db.profile_backgrounds.deleteMany({ where: { uid: caller.id } });
    return ok();
  }

  const colour = body?.value?.toLowerCase() ?? '';
  if (type === 2 && !HEX.test(colour)) throw new Failure(400, 'site.invalid_colour');
  // Which part of the picture stays in view, in percent, and how far it's zoomed in.
  const { x = 50, y = 50, zoom = 100 } = body ?? {};
  if (!within(x, 0, 100) || !within(y, 0, 100) || !within(zoom, 100, 300)) {
    throw new Failure(400, 'site.invalid_request');
  }

  const value = type === 2 ? colour : `${caller.id}.png`;
  const time = Math.floor(Date.now() / 1000);
  await db.profile_backgrounds.upsert({
    where: { uid: caller.id },
    create: { uid: caller.id, time, type, value, pos_x: x, pos_y: y, zoom },
    update: { time, type, value, pos_x: x, pos_y: y, zoom }
  });
  return ok();
});
