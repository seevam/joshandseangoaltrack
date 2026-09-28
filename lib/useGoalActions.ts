'use client';

import { useGoalStore } from './store';
import { getGoalProgress, type TaskCompletionValue } from './types';
import { dayKey } from './dates';
import { logCompletion, toggleMilestone, checkIn } from './completions';

async function apiCall(url: string, method: string, body?: unknown) {
  const opts: RequestInit = { method, headers: {} };
  if (body) {
    (opts.headers as Record<string, string>)['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${method} ${url} failed: ${res.status}`);
  return res.json();
}

/**
 * Goal mutations shared by the dashboard and the goals list, so both stay in
 * sync without duplicating the fetch/persist logic.
 */
export function useGoalActions(hooks?: {
  onXp?: (amount: number, origin?: { x: number; y: number }) => void;
  onGoalComplete?: (goal: ReturnType<typeof useGoalStore.getState>['goals'][number]) => void;
}) {
  const { goals, updateGoal, removeGoal, selectedGoal, setSelectedGoal } = useGoalStore();

  const sync = (saved: Parameters<typeof updateGoal>[0]) => {
    updateGoal(saved);
    if (selectedGoal?.id === saved.id) setSelectedGoal(saved);
  };

  // Destructive actions report whether they happened, so a confirmation can
  // stay open on failure instead of navigating away from a goal that still
  // exists.
  const onDelete = async (id: string): Promise<boolean> => {
    try {
      await apiCall(`/api/goals/${id}`, 'DELETE');
      removeGoal(id);
      return true;
    } catch (err) { console.error('Failed to delete goal:', err); return false; }
  };

  const onCheckIn = async (goalId: string) => {
    // One day appended server-side; a double tap cannot check in twice.
    if (await checkIn(goalId, dayKey())) hooks?.onXp?.(5);
  };

  const onUpdateProgress = async (goalId: string, newValue: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const wasComplete = getGoalProgress(goal) >= 100;
    const progressHistory = [...(goal.progressHistory || []), { date: new Date().toISOString(), value: newValue }];
    try {
      const saved = await apiCall(`/api/goals/${goalId}`, 'PUT', { currentValue: newValue, progressHistory });
      sync(saved);
      if (!wasComplete && getGoalProgress(saved) >= 100) hooks?.onGoalComplete?.(saved);
    } catch (err) { console.error('Failed to update progress:', err); }
  };

  // One milestone flipped in place — two quick ticks can no longer erase each
  // other. Finishing a goal is celebrated app-wide by ProgressCelebrations.
  const onToggleSubtask = async (goalId: string, idx: number) => {
    await toggleMilestone(goalId, idx);
  };

  const onLogTask = async (goalId: string, taskId: number, value: TaskCompletionValue) => {
    // One key, merged server-side — see lib/completions.ts for why.
    await logCompletion(goalId, dayKey(), taskId, value);
  };

  const onAddDailyTask = async (
    goalId: string,
    task: { title: string; targetValue: number | null; unit: string; type: 'number' | 'checkbox' },
  ) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const dailyTasks = [...(goal.dailyTasks || []), { id: Date.now(), ...task }];
    try {
      sync(await apiCall(`/api/goals/${goalId}`, 'PUT', { dailyTasks }));
    } catch (err) { console.error('Failed to add task:', err); }
  };

  /*
   * Identified by id, with the index as a cross-check. A bare index goes stale
   * the moment another delete lands first, and removes the wrong milestone; a
   * bare id is unsafe on old goals whose milestones may share or lack one —
   * filtering on `undefined` would delete them all. So: exactly one milestone,
   * the one at that index if its id still matches, else the first with the id.
   */
  const onRemoveMilestone = async (goalId: string, idx: number, milestoneId?: number): Promise<boolean> => {
    const goal = useGoalStore.getState().goals.find(g => g.id === goalId);
    if (!goal) return false;
    const list = goal.subtasks || [];
    const at = list[idx]?.id === milestoneId
      ? idx
      : milestoneId === undefined ? -1 : list.findIndex(m => m.id === milestoneId);
    if (at < 0) return false;
    const subtasks = list.filter((_, i) => i !== at);
    try {
      sync(await apiCall(`/api/goals/${goalId}`, 'PUT', { subtasks }));
      return true;
    } catch (err) { console.error('Failed to remove milestone:', err); return false; }
  };

  /**
   * Records how long a task actually took and recalibrates from it.
   *
   * The corrected task takes the mean of its own logged actuals. Comparable
   * tasks — same goal, same difficulty, never yet timed — are scaled by the
   * same ratio, which is the point of the feature: one honest correction
   * improves every estimate like it. Tasks the user has already timed are left
   * alone, since their own measurements beat an inference.
   */
  const onCorrectEstimate = async (goalId: string, taskId: number, actual: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal || !Number.isFinite(actual) || actual <= 0) return;
    const minutes = Math.min(Math.max(Math.round(actual), 1), 600);

    const target = (goal.dailyTasks || []).find(t => t.id === taskId);
    if (!target) return;
    const before = target.estimatedMinutes;
    const actuals = [...(target.actualMinutes || []), minutes];
    const mean = Math.round(actuals.reduce((a, b) => a + b, 0) / actuals.length);
    const ratio = before && before > 0 ? mean / before : 1;

    const dailyTasks = (goal.dailyTasks || []).map(t => {
      if (t.id === taskId) return { ...t, actualMinutes: actuals, estimatedMinutes: mean };
      const comparable = t.difficulty === target.difficulty
        && !(t.actualMinutes || []).length
        && typeof t.estimatedMinutes === 'number';
      if (!comparable || ratio === 1) return t;
      return {
        ...t,
        estimatedMinutes: Math.min(Math.max(Math.round(t.estimatedMinutes! * ratio), 5), 240),
      };
    });

    try {
      sync(await apiCall(`/api/goals/${goalId}`, 'PUT', { dailyTasks }));
    } catch (err) { console.error('Failed to correct estimate:', err); }
  };

  const onRemoveDailyTask = async (goalId: string, taskId: number): Promise<boolean> => {
    const goal = useGoalStore.getState().goals.find(g => g.id === goalId);
    if (!goal) return false;
    const dailyTasks = (goal.dailyTasks || []).filter(t => t.id !== taskId);
    try {
      sync(await apiCall(`/api/goals/${goalId}`, 'PUT', { dailyTasks }));
      return true;
    } catch (err) { console.error('Failed to remove task:', err); return false; }
  };

  return {
    onDelete, onCheckIn, onUpdateProgress, onToggleSubtask, onLogTask,
    onAddDailyTask, onRemoveDailyTask, onRemoveMilestone, onCorrectEstimate,
  };
}
