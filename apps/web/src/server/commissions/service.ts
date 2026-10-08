import { db } from '$server/db';
import { Prisma } from '$server/generated/client';
import { Failure } from '$server/respond';
import { loadContext } from './context';
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

// The checks are repeated at most every 30 seconds per player; refreshing the page does nothing in between.
const lastChecked = new Map<number, number>();
const CHECK_GAP = 30_000;

const findDay = (userId: number, date: string) =>
  db.commission_days.findUnique({
    where: { user_id_day: { user_id: userId, day: new Date(date) } },
    include: { tasks: true }
  });

async function rollIfMissing(userId: number, date: string, settings: Settings) {
  const existing = await findDay(userId, date);
  if (existing) return existing;

  const ctx = await loadContext(userId, windowOf(date));
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

export async function todayFor(userId: number, now = new Date()) {
  const settings = await loadSettings();
  const window = dayWindow(now);
  let day = await rollIfMissing(userId, window.date, settings);

  const due = (lastChecked.get(userId) ?? 0) + CHECK_GAP <= now.getTime();
  const pending = day.tasks.filter((task) => !task.completed_at);
  if (due && pending.length) {
    lastChecked.set(userId, now.getTime());
    const ctx = await loadContext(userId, window);
    const results = await Promise.all(
      day.tasks.map((task) =>
        task.completed_at
          ? Promise.resolve(task.progress)
          : (byKey.get(task.template)?.check(ctx, task.params as Params) ?? Promise.resolve(0))
      )
    );
    const { tasks, points } = applyChecks(day.tasks, results);
    const top = settings.thresholds[settings.thresholds.length - 1].points;
    const completedAt = day.completed_at ?? (points >= top ? now : null);

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
            data: { progress: task.progress, completed_at: task.completed_at }
          })
        ),
      db.commission_days.update({
        where: { id: day.id },
        data: { points, completed_at: completedAt }
      })
    ]);
    day = { ...day, tasks, points, completed_at: completedAt };
  }

  return { day: view(day, settings), streaks: await streaksFor(userId, now) };
}

function view(day: Awaited<ReturnType<typeof rollIfMissing>>, settings: Settings): DayView {
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
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : dayWindow().date;
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
