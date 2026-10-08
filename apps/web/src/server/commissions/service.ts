import { record } from '$server/admin/console';
import { db } from '$server/db';
import { Prisma } from '$server/generated/client';
import { Failure } from '$server/respond';
import { loadContext, type PlayerContext } from './context';
import { dayWindow, windowOf } from './day';
import { rollDay } from './roll';
import { loadSettings, type Settings, type Threshold } from './settings';
import { streakStats, type StreakStats } from './streaks';
import { byKey, templates } from './templates';
import type { Params } from './templates/types';

export interface TaskView {
  id: number;
  template: string;
  params: Params;
  link: string | null;
  points: number;
  target: number;
  progress: number;
  completed: boolean;
}

export interface DayView {
  date: string;
  points: number;
  claimedTier: number;
  completedAt: string | null;
  thresholds: Threshold[];
  tasks: TaskView[];
}

interface TaskRow {
  id: number | bigint;
  points: number;
  target: number;
  progress: number;
  completed_at: Date | null;
}

export const tierReached = (thresholds: Threshold[], points: number) =>
  thresholds.filter((threshold) => points >= threshold.points).length;

export function applyChecks<T extends TaskRow>(tasks: T[], results: number[]) {
  const now = new Date();
  const updated = tasks.map((task, index) => {
    if (task.completed_at) return task;
    const progress = Math.min(task.target, results[index]);
    return { ...task, progress, completed_at: progress >= task.target ? now : null };
  });
  const points = updated
    .filter((task) => task.completed_at)
    .reduce((sum, task) => sum + task.points, 0);
  return { tasks: updated, points };
}

// The checks are repeated at most every 30 seconds per player and day; refreshing the page does nothing in between.
const lastChecked = new Map<string, number>();
const CHECK_GAP = 30_000;

function markChecked(key: string, now: number) {
  for (const [id, time] of lastChecked) if (time + CHECK_GAP <= now) lastChecked.delete(id);
  lastChecked.set(key, now);
}

// A request that arrives while another is still checking waits for it, so it never shows the progress from before.
const inFlight = new Map<number, Promise<unknown>>();

// One broken template must not cost the player the rest of the pass, so a failed check keeps its stored progress.
export function runChecks(
  tasks: { template: string; params: unknown; progress: number; completed_at: Date | null }[],
  ctx: PlayerContext
) {
  return Promise.all(
    tasks.map((task) => {
      const found = byKey.get(task.template);
      if (task.completed_at || !found) return task.progress;
      return found.check(ctx, task.params as Params).catch((error) => {
        void record('error', ctx.id, error);
        return task.progress;
      });
    })
  );
}

const findDay = (userId: number, date: string) =>
  db.commission_days.findUnique({
    where: { user_id_day: { user_id: userId, day: new Date(date) } },
    include: { tasks: true }
  });

async function rollIfMissing(
  userId: number,
  date: string,
  settings: Settings,
  context: (() => Promise<PlayerContext>) | null = null
) {
  const existing = await findDay(userId, date);
  if (existing) return existing;

  const ctx = await (context ?? (() => loadContext(userId, windowOf(date))))();
  const rolled = rollDay(templates, ctx, settings);
  try {
    return await db.commission_days.create({
      data: {
        user_id: userId,
        day: new Date(date),
        rolled_at: new Date(),
        tasks: {
          create: rolled.map((task) => ({
            template: task.template,
            params: task.params,
            points: task.points,
            target: task.target
          }))
        }
      },
      include: { tasks: true }
    });
  } catch (error) {
    // A second tab rolled first; the unique key makes this one lose, so it reads what the winner wrote.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return (await findDay(userId, date))!;
    }
    throw error;
  }
}

type Day = Awaited<ReturnType<typeof rollIfMissing>>;

async function checkDay(
  userId: number,
  day: Day,
  settings: Settings,
  context: () => Promise<PlayerContext>,
  now: Date
): Promise<Day> {
  const key = `${userId}:${day.day.toISOString().slice(0, 10)}`;
  const due = (lastChecked.get(key) ?? 0) + CHECK_GAP <= now.getTime();
  if (!due || day.tasks.every((task) => task.completed_at)) return day;
  markChecked(key, now.getTime());

  const results = await runChecks(day.tasks, await context());
  const { tasks, points } = applyChecks(day.tasks, results);
  const top = settings.thresholds[settings.thresholds.length - 1].points;
  const completedNow = !day.completed_at && points >= top;

  await db.$transaction([
    ...tasks
      .filter(
        (task, index) =>
          task.progress !== day.tasks[index].progress ||
          task.completed_at !== day.tasks[index].completed_at
      )
      .map((task) =>
        db.commission_tasks.update({
          where: { id: task.id },
          data: {
            progress: task.progress,
            ...(task.completed_at && { completed_at: task.completed_at })
          }
        })
      ),
    db.commission_days.update({
      where: { id: day.id },
      data: { points, ...(completedNow && { completed_at: now }) }
    })
  ]);
  return { ...day, tasks, points, completed_at: completedNow ? now : day.completed_at };
}

const previousDate = (date: string) =>
  new Date(new Date(date).getTime() - 86_400_000).toISOString().slice(0, 10);

// Yesterday gets checked again until it's complete, since some tasks (daily challenge placements) only settle at
// the rollover. It is never rolled after the fact.
async function checkPass(userId: number, now: Date, settings: Settings) {
  const window = dayWindow(now);
  const before = previousDate(window.date);
  // Rolling and checking read the same context, so a first visit loads it once.
  let loaded: Promise<PlayerContext> | undefined;
  const context = () => (loaded ??= loadContext(userId, window));
  const [today, previous] = await Promise.all([
    rollIfMissing(userId, window.date, settings, context),
    findDay(userId, before)
  ]);
  // A broken recheck of yesterday falls back to its stored row, so today's page still loads.
  return Promise.all([
    checkDay(userId, today, settings, context, now),
    previous &&
      checkDay(userId, previous, settings, () => loadContext(userId, windowOf(before)), now).catch(
        (error) => {
          void record('error', userId, error);
          return previous;
        }
      )
  ]);
}

async function currentDays(userId: number, now: Date, settings: Settings) {
  const running = inFlight.get(userId);
  if (running) {
    await running.catch(() => {});
    const window = dayWindow(now);
    return Promise.all([
      rollIfMissing(userId, window.date, settings),
      findDay(userId, previousDate(window.date))
    ]);
  }
  const pass = checkPass(userId, now, settings);
  inFlight.set(userId, pass);
  try {
    return await pass;
  } finally {
    inFlight.delete(userId);
  }
}

export async function todayFor(userId: number, now = new Date()) {
  const settings = await loadSettings();
  const [today, previous] = await currentDays(userId, now, settings);
  const open =
    previous &&
    (previous.tasks.some((task) => !task.completed_at) ||
      tierReached(settings.thresholds, previous.points) > previous.claimed_tier);

  return {
    day: view(today, settings),
    previous: open ? view(previous, settings) : null,
    streaks: await streaksFor(userId, now)
  };
}

function view(day: Day, settings: Settings): DayView {
  return {
    date: day.day.toISOString().slice(0, 10),
    points: day.points,
    claimedTier: day.claimed_tier,
    completedAt: day.completed_at?.toISOString() ?? null,
    thresholds: settings.thresholds,
    tasks: day.tasks.map((task) => {
      const params = task.params as Params;
      return {
        id: Number(task.id),
        template: task.template,
        params,
        link: byKey.get(task.template)?.link?.(params) ?? null,
        points: task.points,
        target: task.target,
        progress: task.progress,
        completed: task.completed_at !== null
      };
    })
  };
}

export async function claim(userId: number, tier: number, date?: string) {
  const settings = await loadSettings();
  if (!Number.isInteger(tier) || tier < 1 || tier > settings.thresholds.length)
    throw new Failure(400, 'site.invalid_request');
  if (date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Failure(400, 'site.invalid_request');
  const day = date ?? dayWindow().date;
  const coins = settings.thresholds[tier - 1].coins;

  return db.$transaction(async (tx) => {
    const [row] = await tx.$queryRaw<{ id: bigint; points: number; claimed_tier: number }[]>`
      SELECT id, points, claimed_tier FROM commission_days WHERE user_id = ${userId} AND day = ${day} FOR UPDATE`;
    if (!row) throw new Failure(404, 'commissions.day_missing');
    if (row.claimed_tier >= tier) throw new Failure(409, 'commissions.already_claimed');
    if (row.claimed_tier !== tier - 1 || tierReached(settings.thresholds, row.points) < tier)
      throw new Failure(409, 'commissions.tier_locked');

    await tx.commission_days.update({ where: { id: row.id }, data: { claimed_tier: tier } });
    const user = await tx.users.update({
      where: { id: userId },
      data: { coins: { increment: coins } },
      select: { coins: true }
    });
    return { balance: user.coins };
  });
}

export async function streaksFor(userId: number, now = new Date()): Promise<StreakStats> {
  const rows = await db.commission_days.findMany({
    where: { user_id: userId, completed_at: { not: null } },
    select: { day: true }
  });
  return streakStats(
    rows.map((row) => row.day),
    new Date(dayWindow(now).date)
  );
}
