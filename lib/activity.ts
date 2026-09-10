import type { Goal } from './types';
import { milestoneXp, completionXp } from './xp';

export interface ActivityItem {
  id: string;
  type: 'task_completed' | 'task_recovered' | 'milestone_completed' | 'goal_created' | 'check_in';
  title: string;
  description?: string;
  xpGained: number;
  date: string;
  icon: string;
  color: string;
}

/**
 * Derived from goal data — there's no activity table, so completions and
 * check-ins are reconstructed and sorted newest first.
 */
export function buildActivityFeed(goals: Goal[], limit = 25): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const goal of goals) {
    const taskById = new Map((goal.dailyTasks || []).map(t => [String(t.id), t]));

    for (const [date, day] of Object.entries(goal.taskCompletions || {})) {
      for (const [taskId, value] of Object.entries(day)) {
        if (!value) continue;
        const task = taskById.get(taskId);
        // The recovery version reads as its own kind of event, not a lesser
        // task completion — momentum preserved, not a failure.
        const recovered = value === 'fallback';
        items.push({
          id: `task-${goal.id}-${taskId}-${date}`,
          type: recovered ? 'task_recovered' : 'task_completed',
          title: recovered
            ? `${task?.title || 'Task'} — 10-minute version`
            : (task?.title || 'Task completed'),
          description: goal.title,
          xpGained: completionXp(value, task?.difficulty),
          date,
          icon: recovered ? 'waves' : 'footprints',
          color: recovered ? '#38BDF8' : '#5DBC70',
        });
      }
    }

    (goal.subtasks || []).forEach((s, i) => {
      if (!s.completed) return;
      /*
       * We don't store a completion timestamp, so the best available date is
       * the milestone's planned date — but that is frequently in the future,
       * which pushed unfinished-looking entries to the top of a feed labelled
       * "recent". Clamp to today so a completed milestone can never be dated
       * later than the moment it was observed complete.
       */
      const planned = goal.startDate
        ? new Date(new Date(goal.startDate).getTime() + s.daysFromStart * 86400000).toISOString().split('T')[0]
        : '';
      const fallback = (goal.updatedAt || goal.createdAt || '').split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      const candidate = planned || fallback;
      const date = candidate > todayStr ? (fallback && fallback <= todayStr ? fallback : todayStr) : candidate;
      items.push({
        id: `ms-${goal.id}-${i}`,
        type: 'milestone_completed',
        title: s.title,
        description: goal.title,
        xpGained: milestoneXp(s.difficulty),
        date,
        icon: 'flag',
        color: '#3B82F6',
      });
    });

    for (const date of goal.checkIns || []) {
      items.push({
        id: `ci-${goal.id}-${date}`,
        type: 'check_in',
        title: 'Checked in',
        description: goal.title,
        xpGained: 5,
        date,
        icon: 'zap',
        color: '#FBBF24',
      });
    }

    if (goal.createdAt) {
      items.push({
        id: `new-${goal.id}`,
        type: 'goal_created',
        title: `Created "${goal.title}"`,
        xpGained: 0,
        date: goal.createdAt.split('T')[0],
        icon: 'target',
        color: '#A78BFA',
      });
    }
  }

  return items
    .filter(i => i.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}
