import { taskText } from '$lib/commissions';
import { todayFor } from './service';

export async function summaryFor(userId: number) {
  const { day } = await todayFor(userId);
  return {
    done: day.tasks.filter((task) => task.completed).length,
    total: day.tasks.length,
    points: day.points,
    top: day.thresholds.at(-1)?.points ?? 0,
    tasks: day.tasks.map((task) => ({
      text: taskText(task),
      progress: task.progress,
      target: task.target,
      completed: task.completed
    }))
  };
}
