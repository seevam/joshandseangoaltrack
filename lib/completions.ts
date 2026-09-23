'use client';

import { useGoalStore } from './store';
import type { Goal, TaskCompletionValue } from './types';

/**
 * Log one task completion — shared by the dashboard, the goal page and the
 * calendar so all three save the same way.
 *
 * The store is updated first, from its *latest* state, and only this one key
 * is sent. Each caller used to rebuild the goal's whole completion map from the
 * copy it rendered with, then replace the store with whatever the server
 * returned — so two quick taps raced, and the slower response could put the
 * first tick back to unticked on screen even after both had saved.
 *
 * Returns the goal as it stood before the change, for XP and prompts, or null
 * if the save failed (in which case the tick is rolled back).
 */
export async function logCompletion(
  goalId: string,
  date: string,
  taskId: number,
  value: TaskCompletionValue,
): Promise<Goal | null> {
  const { goals, updateGoal } = useGoalStore.getState();
  const before = goals.find(g => g.id === goalId);
  if (!before) return null;

  const apply = (v: TaskCompletionValue | undefined) => {
    const latest = useGoalStore.getState().goals.find(g => g.id === goalId);
    if (!latest) return;
    const day = { ...(latest.taskCompletions?.[date] || {}) };
    if (v === undefined) delete day[taskId];
    else day[taskId] = v;
    updateGoal({ ...latest, taskCompletions: { ...(latest.taskCompletions || {}), [date]: day } });
  };

  const previous = before.taskCompletions?.[date]?.[taskId];
  apply(value);

  try {
    const res = await fetch(`/api/goals/${goalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completion: { date, taskId, value } }),
    });
    if (!res.ok) throw new Error(String(res.status));
    return before;
  } catch (err) {
    console.error('Failed to log task:', err);
    apply(previous);
    return null;
  }
}
