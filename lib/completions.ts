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

/**
 * Apply a change to the latest copy of a goal in the store, send only that
 * change, and undo it if the save fails. The shared shape of every "tap to
 * tick" action — see logCompletion above for the race it prevents.
 */
async function optimistic(
  goalId: string,
  change: (g: Goal) => Goal,
  body: Record<string, unknown>,
): Promise<boolean> {
  const { goals, updateGoal } = useGoalStore.getState();
  const before = goals.find(g => g.id === goalId);
  if (!before) return false;
  updateGoal(change(before));
  try {
    const res = await fetch(`/api/goals/${goalId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(String(res.status));
    return true;
  } catch (err) {
    console.error('Save failed, reverting:', err);
    const latest = useGoalStore.getState().goals.find(g => g.id === goalId);
    // Revert only our own change, leaving any other tick made since in place.
    if (latest) updateGoal(revertWith(latest, before, body));
    return false;
  }
}

/** Puts back exactly the field this request touched, from the pre-change copy. */
function revertWith(latest: Goal, before: Goal, body: Record<string, unknown>): Goal {
  if (body.milestone) {
    const { index } = body.milestone as { index: number };
    const subtasks = (latest.subtasks || []).map((m, i) =>
      i === index ? { ...m, completed: before.subtasks?.[index]?.completed ?? m.completed } : m);
    return { ...latest, subtasks };
  }
  if (typeof body.checkIn === 'string') {
    const had = (before.checkIns || []).includes(body.checkIn);
    return had ? latest : { ...latest, checkIns: (latest.checkIns || []).filter(d => d !== body.checkIn) };
  }
  return latest;
}

/** Tick or untick one milestone, by position cross-checked against its id. */
export function toggleMilestone(goalId: string, index: number): Promise<boolean> {
  const goal = useGoalStore.getState().goals.find(g => g.id === goalId);
  const m = goal?.subtasks?.[index];
  if (!goal || !m) return Promise.resolve(false);
  const completed = !m.completed;
  return optimistic(
    goalId,
    g => ({ ...g, subtasks: (g.subtasks || []).map((x, i) => (i === index ? { ...x, completed } : x)) }),
    { milestone: { index, id: m.id ?? null, completed } },
  );
}

/** Check in for a day. A second check-in on the same day is a no-op. */
export function checkIn(goalId: string, day: string): Promise<boolean> {
  const goal = useGoalStore.getState().goals.find(g => g.id === goalId);
  if (!goal || (goal.checkIns || []).includes(day)) return Promise.resolve(false);
  return optimistic(
    goalId,
    g => ({ ...g, checkIns: [...(g.checkIns || []), day] }),
    { checkIn: day },
  );
}
