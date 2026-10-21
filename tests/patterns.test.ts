import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findMissPatterns, rescheduledDays } from '../lib/patterns';
import { isGoalFinished, activeTasks } from '../lib/stages';
import { dayKey } from '../lib/dates';
import { makeGoal } from '../scripts/ui-harness/fixtures';
import type { Goal } from '../lib/types';

const DAY = 86400000;

/** One stage, one every-day task, done every past day except on `skipDow`. */
function habit(skipDow: number | null, days = 42): Goal {
  const g = makeGoal({ id: 'p', title: 'Run a 10k', category: 'fitness', stages: 1, daysAgo: days });
  const task = { ...g.dailyTasks[0], daysOfWeek: [] };
  const taskCompletions: Goal['taskCompletions'] = {};
  for (let d = 1; d <= days; d++) {
    const date = new Date(Date.now() - d * DAY);
    if (date.getDay() !== skipDow) taskCompletions[dayKey(date)] = { [task.id]: true };
  }
  return { ...g, dailyTasks: [task], taskCompletions };
}

test('a weekday that is reliably missed is found, with a better day suggested', () => {
  const thursday = 4;
  const patterns = findMissPatterns([habit(thursday)]);
  assert.equal(patterns.length, 1);
  assert.equal(patterns[0].weekday, thursday);
  assert.ok(patterns[0].missed >= 3);
  // An every-day task has no free day to move to: the fix is to drop Thursday.
  assert.equal(patterns[0].suggestDay, null);
  const days = rescheduledDays({ ...habit(thursday).dailyTasks[0] }, patterns[0]);
  assert.deepEqual(days, [0, 1, 2, 3, 5, 6]);
});

test('a task done every day has no pattern', () => {
  assert.equal(findMissPatterns([habit(null)]).length, 0);
});

test('a task on fixed days moves its weak day to the most reliable free one', () => {
  const g = habit(null);
  // Scheduled Mon/Thu; Thursdays never done. Saturday work (from another goal) is reliable.
  const task = { ...g.dailyTasks[0], daysOfWeek: [1, 4] };
  const comps: Goal['taskCompletions'] = {};
  for (let d = 1; d <= 42; d++) {
    const date = new Date(Date.now() - d * DAY);
    if (date.getDay() === 1) comps[dayKey(date)] = { [task.id]: true };
  }
  const other = { ...habit(null), id: 'q', dailyTasks: [{ ...g.dailyTasks[0], id: 7, daysOfWeek: [6] }] };
  other.taskCompletions = Object.fromEntries(
    Array.from({ length: 42 }, (_, i) => new Date(Date.now() - (i + 1) * DAY))
      .filter(d => d.getDay() === 6).map(d => [dayKey(d), { 7: true }]),
  );
  const [p] = findMissPatterns([{ ...g, dailyTasks: [task], taskCompletions: comps }, other]);
  assert.equal(p.weekday, 4);
  assert.equal(p.suggestDay, 6);
  assert.deepEqual(rescheduledDays(task, p), [1, 6]);
});

test('a finished goal has no live recurring tasks', () => {
  const g = makeGoal({ id: 'f', title: 'Run a 10k', category: 'fitness', stages: 1 });
  const done = { ...g, subtasks: g.subtasks.map(m => ({ ...m, completed: true, completedAt: new Date().toISOString() })) };
  assert.ok(isGoalFinished(done));
  assert.deepEqual(activeTasks(done), []);
  // Days before it was finished still had their work.
  assert.ok(activeTasks(done, Date.now() - 2 * DAY).length > 0);
});
