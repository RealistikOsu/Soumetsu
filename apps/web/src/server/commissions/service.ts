import { record } from '$server/admin/console';
import { db } from '$server/db';
import { Prisma } from '$server/generated/client';
import { Failure } from '$server/respond';
import { loadContext, type PlayerContext } from './context';
import { loadClock } from './clock';
import type { DayClock, DayWindow } from './day';
import { rollDay, rollReplacement } from './roll';
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
  endsAt: string;
  // When the day's challenge ends and its placements settle, which can come before a long day ends.
  settlesAt: string;
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

function switchedOff(template: string, params: unknown, settings: Settings) {
  const found = byKey.get(template);
  if (!found || (settings.weights[template] ?? 1) <= 0) return true;
  return !settings.lazerTasks && !!found.lazer?.(params as Params);
}

type Day = NonNullable<Awaited<ReturnType<typeof findDay>>>;

// Staff can switch a template off after players already rolled it today; those tasks are swapped for another
// template while they're still open, keeping their points so the day's bar doesn't move.
async function replaceSwitchedOff(
  day: Day,
  settings: Settings,
  context: () => Promise<PlayerContext>
): Promise<Day> {
  const stale = day.tasks.filter(
    (task) => !task.completed_at && switchedOff(task.template, task.params, settings)
  );
  if (!stale.length) return day;

  const ctx = await context();
  const families = new Set(
    day.tasks
      .filter((task) => !stale.includes(task))
      .map((task) => byKey.get(task.template)?.family)
      .filter((family): family is string => !!family)
  );
  const updates = [];
  for (const task of stale) {
    const tier = byKey.get(task.template)?.tier;
    const replacement = rollReplacement(templates, ctx, settings, tier, families);
    if (!replacement) continue;
    families.add(byKey.get(replacement.template)!.family);
    updates.push(
      db.commission_tasks.updateMany({
        where: { id: task.id, template: task.template, completed_at: null },
        data: {
          template: replacement.template,
          params: replacement.params,
          target: replacement.target,
          progress: 0
        }
      })
    );
  }
  if (!updates.length) return day;
  await db.$transaction(updates);
  return (await findDay(day.user_id, day.day.toISOString().slice(0, 10))) ?? day;
}

async function rollIfMissing(
  userId: number,
  date: string,
  settings: Settings,
  context: (() => Promise<PlayerContext>) | null = null
) {
  const load =
    context ??
    (async () => loadContext(userId, (await loadClock()).windowOf(date), { roll: true }));
  const existing = await findDay(userId, date);
  if (existing) return replaceSwitchedOff(existing, settings, load);

  const ctx = await load();
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

async function checkDay(
  userId: number,
  day: Day,
  settings: Settings,
  context: () => Promise<PlayerContext>,
  now: Date,
  only: (task: Day['tasks'][number]) => boolean = () => true
): Promise<Day> {
  const key = `${userId}:${day.day.toISOString().slice(0, 10)}`;
  const due = (lastChecked.get(key) ?? 0) + CHECK_GAP <= now.getTime();
  const live = day.tasks.filter((task) => !task.completed_at && only(task));
  if (!due || !live.length) return day;
  markChecked(key, now.getTime());

  const checked = await runChecks(live, await context());
  const results = day.tasks.map((task) => {
    const index = live.indexOf(task);
    return index === -1 ? task.progress : checked[index];
  });
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

const DAY = 86_400_000;
// Progress can land after yesterday's last check (casino, shop, matches and scores near the rollover), so yesterday
// gets full rechecks until one has run a little after it ended. Its challenge's plays run until a day after it started,
// even when the next challenge starts sooner.
const ROLLOVER_GRACE = 5 * 60_000;
// Daily challenge placements are written when the challenge rolls over. After the full recheck only those are
// rechecked, until the player's row is finalised (or they never passed the map), giving up a day after the day ended.
const SETTLE_LIMIT = DAY;
// Both kept in memory: a restart costs one extra check.
const fullyChecked = new Map<string, number>();
const settled = new Map<string, number>();

function remember(map: Map<string, number>, key: string, until: number, now: number) {
  for (const [old, expiry] of map) if (expiry <= now) map.delete(old);
  map.set(key, until);
}

const cutoffOf = (window: DayWindow) =>
  Math.max(window.end.getTime(), window.start.getTime() + DAY) + ROLLOVER_GRACE;

function lateChecks(key: string, window: DayWindow, now: Date) {
  if (!fullyChecked.has(key)) return () => true;
  if (now.getTime() >= window.end.getTime() + SETTLE_LIMIT || settled.has(key)) return null;
  return (task: Day['tasks'][number]) => !!byKey.get(task.template)?.settlesLate;
}

async function recheckYesterday(
  userId: number,
  day: Day,
  window: DayWindow,
  settings: Settings,
  now: Date
) {
  const key = `${userId}:${window.date}`;
  const at = now.getTime();
  const expiry = Math.max(cutoffOf(window), window.end.getTime() + SETTLE_LIMIT) + DAY;
  const full = !fullyChecked.has(key);
  const only = lateChecks(key, window, now);
  if (!only) return day;
  let loaded: Promise<PlayerContext> | undefined;
  const checked = await checkDay(
    userId,
    day,
    settings,
    () => (loaded ??= loadContext(userId, window)),
    now,
    only
  );
  const open = checked.tasks.some((task) => !task.completed_at);
  if (full) {
    if (at >= cutoffOf(window) && (loaded || !open)) remember(fullyChecked, key, expiry, at);
  } else if (loaded) {
    const daily = await (await loaded).daily();
    const over = at >= window.start.getTime() + DAY;
    if (!daily || daily.finalised || (over && !daily.scores.some((score) => score.passed)))
      remember(settled, key, expiry, at);
  }
  return checked;
}

// Yesterday is never rolled after the fact, and only rechecked while its tasks can still change.
async function checkPass(userId: number, now: Date, settings: Settings) {
  const clock = await loadClock();
  const window = clock.dayWindow(now);
  const before = clock.previous(window);
  // Rolling needs more of the player's history than checking does; a first visit rolls and checks with one load.
  let rolling: Promise<PlayerContext> | undefined;
  let checking: Promise<PlayerContext> | undefined;
  const rollContext = () => (rolling ??= loadContext(userId, window, { roll: true }));
  const checkContext = () => rolling ?? (checking ??= loadContext(userId, window));
  const [today, previous] = await Promise.all([
    rollIfMissing(userId, window.date, settings, rollContext),
    findDay(userId, before.date)
  ]);
  // A broken recheck of yesterday falls back to its stored row, so today's page still loads.
  return Promise.all([
    checkDay(userId, today, settings, checkContext, now),
    previous &&
      recheckYesterday(userId, previous, before, settings, now).catch((error) => {
        void record('error', userId, error);
        return previous;
      })
  ]);
}

async function currentDays(userId: number, now: Date, settings: Settings) {
  const running = inFlight.get(userId);
  if (running) {
    await running.catch(() => {});
    const clock = await loadClock();
    const window = clock.dayWindow(now);
    return Promise.all([
      rollIfMissing(userId, window.date, settings),
      findDay(userId, clock.previous(window).date)
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
  const [settings, clock] = await Promise.all([loadSettings(), loadClock()]);
  const [today, previous] = await currentDays(userId, now, settings);
  const open =
    previous &&
    (previous.tasks.some((task) => !task.completed_at) ||
      tierReached(settings.thresholds, previous.points) > previous.claimed_tier);

  return {
    day: view(today, settings, clock),
    previous: open ? view(previous, settings, clock) : null,
    streaks: await streaksFor(userId, now)
  };
}

// A score was just submitted, so today's tasks are checked straight away rather than waiting out the gap, and the
// caller learns what this check completed.
export async function recheckToday(userId: number, now = new Date()) {
  const [settings, clock] = await Promise.all([loadSettings(), loadClock()]);
  const date = clock.dayWindow(now).date;
  const before = await findDay(userId, date);
  const doneBefore = new Set(
    before?.tasks.filter((task) => task.completed_at).map((task) => Number(task.id)) ?? []
  );
  const tierBefore = before ? tierReached(settings.thresholds, before.points) : 0;

  lastChecked.delete(`${userId}:${date}`);
  const [today] = await currentDays(userId, now, settings);
  const day = view(today, settings, clock);
  return {
    day,
    completed: day.tasks.filter((task) => task.completed && !doneBefore.has(task.id)),
    tiers: settings.thresholds.slice(tierBefore, tierReached(settings.thresholds, day.points))
  };
}

const windowTimes = (window: DayWindow) => ({
  endsAt: window.end.toISOString(),
  settlesAt: new Date(
    Math.min(window.end.getTime(), window.start.getTime() + 86_400_000)
  ).toISOString()
});

function view(day: Day, settings: Settings, clock: DayClock): DayView {
  return {
    date: day.day.toISOString().slice(0, 10),
    ...windowTimes(clock.windowOf(day.day.toISOString().slice(0, 10))),
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
  const day = date ?? (await loadClock()).dayWindow(new Date()).date;
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
    new Date((await loadClock()).dayWindow(now).date)
  );
}
