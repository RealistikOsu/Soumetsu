import type { Prisma } from '$server/generated/client';
import { db } from '$server/db';
import { Failure } from '$server/respond';
import { rapLog } from '$server/admin/log';

export type Tier = 'easy' | 'medium' | 'hard';

export interface Threshold {
  points: number;
  coins: number;
}

export interface FamousMap {
  beatmapId: number;
  name: string;
}

export interface Settings {
  tasksPerDay: number;
  minDayPoints: number;
  thresholds: Threshold[];
  tierPoints: Record<Tier, number>;
  weights: Record<string, number>;
  artists: string[];
  famousMaps: FamousMap[];
}

export const DEFAULT_SETTINGS: Settings = {
  tasksPerDay: 6,
  minDayPoints: 300,
  thresholds: [
    { points: 100, coins: 50 },
    { points: 200, coins: 60 },
    { points: 300, coins: 90 }
  ],
  tierPoints: { easy: 30, medium: 50, hard: 80 },
  weights: {},
  artists: ['Camellia', 'xi', 't+pazolite', 'Kobaryo', 'DragonForce', 'USAO', 'LeaF'],
  famousMaps: [
    { beatmapId: 129891, name: 'Freedom Dive [FOUR DIMENSIONS]' },
    { beatmapId: 131891, name: "The Big Black [WHO'S AFRAID OF THE BIG BLACK]" },
    { beatmapId: 1215220, name: 'Blue Zenith [FOUR DIMENSIONS]' },
    { beatmapId: 252002, name: 'Image Material [Scorpiour]' }
  ]
};

const positiveInt = (value: unknown) => Number.isInteger(value) && (value as number) > 0;

export function parseSettings(raw: unknown): Settings | null {
  if (!raw || typeof raw !== 'object') return null;
  const input = raw as Record<string, unknown>;

  const thresholds = input.thresholds;
  if (!Array.isArray(thresholds) || thresholds.length !== 3) return null;
  for (const [index, threshold] of thresholds.entries()) {
    if (!threshold || typeof threshold !== 'object') return null;
    const { points, coins } = threshold as Record<string, unknown>;
    if (!positiveInt(points) || !Number.isInteger(coins) || (coins as number) < 0) return null;
    if (index > 0 && (points as number) <= (thresholds[index - 1] as Threshold).points) return null;
  }

  const tierPoints = input.tierPoints as Record<string, unknown> | undefined;
  if (
    !tierPoints ||
    !positiveInt(tierPoints.easy) ||
    !positiveInt(tierPoints.medium) ||
    !positiveInt(tierPoints.hard)
  ) {
    return null;
  }

  const weights = (input.weights ?? {}) as Record<string, unknown>;
  if (typeof weights !== 'object' || Array.isArray(weights)) return null;
  for (const value of Object.values(weights)) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  }

  const artists = input.artists ?? DEFAULT_SETTINGS.artists;
  if (
    !Array.isArray(artists) ||
    !artists.every((artist) => typeof artist === 'string' && artist.trim())
  )
    return null;

  const famousMaps = input.famousMaps ?? DEFAULT_SETTINGS.famousMaps;
  if (!Array.isArray(famousMaps)) return null;
  for (const map of famousMaps) {
    if (!map || typeof map !== 'object') return null;
    const { beatmapId, name } = map as Record<string, unknown>;
    if (!positiveInt(beatmapId) || typeof name !== 'string' || !name.trim()) return null;
  }

  if (!positiveInt(input.tasksPerDay) || !positiveInt(input.minDayPoints)) return null;
  // A day rolled below the top threshold could never be finished.
  if ((input.minDayPoints as number) < (thresholds[2] as Threshold).points) return null;

  return {
    tasksPerDay: input.tasksPerDay as number,
    minDayPoints: input.minDayPoints as number,
    thresholds: thresholds as Threshold[],
    tierPoints: {
      easy: tierPoints.easy as number,
      medium: tierPoints.medium as number,
      hard: tierPoints.hard as number
    },
    weights: weights as Record<string, number>,
    artists: (artists as string[]).map((artist) => artist.trim()),
    famousMaps: famousMaps as FamousMap[]
  };
}

export async function loadSettings(): Promise<Settings> {
  const row = await db.commission_settings.findUnique({ where: { id: 1 } });
  return (row && parseSettings(row.settings)) ?? DEFAULT_SETTINGS;
}

export async function saveSettings(staffId: number, raw: unknown) {
  const settings = parseSettings(raw);
  if (!settings) throw new Failure(400, 'site.invalid_request');
  // Settings is an interface, which Prisma's Json input type won't accept without a cast.
  const json = settings as unknown as Prisma.InputJsonObject;
  await db.commission_settings.upsert({
    where: { id: 1 },
    create: { id: 1, settings: json, updated_at: new Date() },
    update: { settings: json, updated_at: new Date() }
  });
  await rapLog(staffId, 'updated the commission settings');
  return settings;
}
