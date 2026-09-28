import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeGoalHealth } from '../lib/goalHealth';
import { dayKey } from '../lib/dates';
import { makeGoal } from '../scripts/ui-harness/fixtures';
import type { Goal } from '../lib/types';

const DAY = 86400000;
const ago = (d: number) => dayKey(new Date(Date.now() - d * DAY));

/** A fresh one-stage goal with one daily task, started `days` ago. */
function simple(days: number, extra: Partial<Goal> = {}): Goal {
  const g = makeGoal({ id: 'h', title: 'x', category: 'fitness', stages: 1, daysAgo: days });
  return {
    ...g,
    subtasks: [],
    dailyTasks: [g.dailyTasks[0]],
    taskCompletions: {},
    ...extra,
  };
}

test('a goal created just now is at 100 and Thriving', () => {
  const g = makeGoal({ id: 'n', title: 'x', category: 'fitness', daysAgo: 0 });
  const h = computeGoalHealth(g);
  assert.equal(h.score, 100);
  assert.equal(h.status, 'Thriving');
  assert.equal(h.missedMilestones, 0);
});

test('stored full ISO dates never produce NaN', () => {
  const g = makeGoal({ id: 'n', title: 'x', category: 'fitness', daysAgo: 3 });
  assert.ok(g.startDate!.includes('T'));
  assert.ok(Number.isFinite(computeGoalHealth(g).score));
  const junk = { ...g, startDate: 'not a date', createdAt: 'nope', endDate: 'no' };
  assert.ok(Number.isFinite(computeGoalHealth(junk).score));
});

test('today is never judged; each missed past day costs 1.5 per task', () => {
  const h = computeGoalHealth(simple(3));
  assert.equal(h.missedDays, 3);
  assert.equal(h.score, Math.round(100 - 3 * 1.5));
});

test('a clean record is capped at 100; credit heals but never banks', () => {
  const clean = simple(10, {
    taskCompletions: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [ago(i + 1), { 1000: true }])),
  });
  assert.equal(computeGoalHealth(clean).score, 100);
});

test('an overdue milestone costs more than a missed task', () => {
  const g = simple(3, {
    dailyTasks: [],
    subtasks: [{ id: 1, title: 'm', daysFromStart: 1, completed: false }],
  });
  const h = computeGoalHealth(g);
  assert.equal(h.missedMilestones, 1);
  assert.ok(h.score < 100 - 1.5);
});

test('opening a new stage does not re-judge past days against it', () => {
  // Twenty days in stage 1, its tasks done every day; stage 1's milestones
  // were all finished today, so stage 2 has just opened.
  const g = makeGoal({ id: 's', title: 'x', category: 'fitness', stages: 2, daysAgo: 20 });
  const now = new Date().toISOString();
  g.subtasks = g.subtasks.map(m => (m.stageId === 's0' ? { ...m, completed: true, completedAt: now, daysFromStart: 60 } : { ...m, daysFromStart: 60 }));
  g.taskCompletions = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [ago(i + 1), { 1000: true, 1001: true }]));
  const h = computeGoalHealth(g);
  assert.equal(h.missedTasks, 0, 'stage 2 tasks must not count before stage 2 began');
  assert.equal(h.score, 100);
});

test('milestones ticked before completedAt existed are treated as ticked today', () => {
  const g = makeGoal({ id: 's', title: 'x', category: 'fitness', stages: 2, daysAgo: 5 });
  g.subtasks = g.subtasks.map(m => (m.stageId === 's0' ? { ...m, completed: true, daysFromStart: 60 } : { ...m, daysFromStart: 60 }));
  g.taskCompletions = Object.fromEntries(Array.from({ length: 5 }, (_, i) => [ago(i + 1), { 1000: true, 1001: true }]));
  assert.equal(computeGoalHealth(g).score, 100);
});
