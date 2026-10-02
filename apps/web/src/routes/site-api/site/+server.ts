import { config } from '$server/config';
import { db } from '$server/db';
import { handle, ok } from '$server/respond';

const NAMES = [
  'website_global_alert',
  'website_maintenance',
  'game_maintenance',
  'registrations_enabled',
  'ccreation_enabled'
];

let cache: { at: number; body: unknown } | null = null;

async function load() {
  const [settings, latest, ranked] = await Promise.all([
    db.system_settings.findMany({ where: { name: { in: NAMES } } }),
    db.$queryRaw<
      { id: number; username: string }[]
    >`SELECT id, username FROM users WHERE privileges & 1 ORDER BY id DESC LIMIT 1`,
    db.beatmaps.count({ where: { ranked_status_freezed: true } })
  ]);
  const get = (name: string) => settings.find((s) => s.name === name);

  return {
    globalAlert: get('website_global_alert')?.value_string || null,
    websiteMaintenance: !!get('website_maintenance')?.value_int,
    gameMaintenance: !!get('game_maintenance')?.value_int,
    registrationsEnabled: !!get('registrations_enabled')?.value_int,
    clanCreationEnabled: !!get('ccreation_enabled')?.value_int,
    latestPlayer: latest[0] ?? null,
    mapsRanked: ranked,
    payments: {
      stripe: !!config.stripe.key,
      freekassa: !!(config.freekassa.merchantId && config.freekassa.secret1),
      paypal: config.paypalEmail || null
    },
    twitchConfigured: !!(config.twitch.id && config.twitch.secret),
    banchoConfigured: !!(config.osu.id && config.osu.secret)
  };
}

export const GET = handle(async () => {
  if (!cache || Date.now() - cache.at > 30_000) cache = { at: Date.now(), body: await load() };
  return ok(cache.body);
});
