'use client';

import { useGoalStore } from './store';
import { getGoalProgress } from './types';

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

  const onDelete = async (id: string) => {
    try {
      await apiCall(`/api/goals/${id}`, 'DELETE');
      removeGoal(id);
    } catch (err) { console.error('Failed to delete goal:', err); }
  };

  const onCheckIn = async (goalId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const goal = goals.find(g => g.id === goalId);
    if (!goal || (goal.checkIns || []).includes(today)) return;
    try {
      sync(await apiCall(`/api/goals/${goalId}`, 'PUT', { checkIns: [...(goal.checkIns || []), today] }));
      hooks?.onXp?.(5);
    } catch (err) { console.error('Failed to check in:', err); }
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

  const onToggleSubtask = async (goalId: string, idx: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const wasComplete = getGoalProgress(goal) >= 100;
    const subtasks = goal.subtasks.map((s, i) => i === idx ? { ...s, completed: !s.completed } : s);
    try {
      const saved = await apiCall(`/api/goals/${goalId}`, 'PUT', { subtasks });
      sync(saved);
      if (!wasComplete && getGoalProgress(saved) >= 100) hooks?.onGoalComplete?.(saved);
    } catch (err) { console.error('Failed to toggle subtask:', err); }
  };

  const onLogTask = async (goalId: string, taskId: number, value: number | boolean) => {
    const today = new Date().toISOString().split('T')[0];
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const taskCompletions = {
      ...(goal.taskCompletions || {}),
      [today]: { ...(goal.taskCompletions?.[today] || {}), [taskId]: value },
    };
    try {
      sync(await apiCall(`/api/goals/${goalId}`, 'PUT', { taskCompletions }));
    } catch (err) { console.error('Failed to log task:', err); }
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

  const onRemoveDailyTask = async (goalId: string, taskId: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    const dailyTasks = goal.dailyTasks.filter(t => t.id !== taskId);
    try {
      sync(await apiCall(`/api/goals/${goalId}`, 'PUT', { dailyTasks }));
    } catch (err) { console.error('Failed to remove task:', err); }
  };

  return { onDelete, onCheckIn, onUpdateProgress, onToggleSubtask, onLogTask, onAddDailyTask, onRemoveDailyTask };
}
