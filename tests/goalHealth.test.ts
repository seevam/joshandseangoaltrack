import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeGoalHealth, BASE_DECAY, DECAY_GROWTH } from '../lib/goalHealth';
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

test('today is never judged; missed days decay health exponentially', () => {
  const h = computeGoalHealth(simple(3));
  assert.equal(h.missedDays, 3);
  let expected = 100;
  for (let run = 1; run <= 3; run++) expected *= 1 - BASE_DECAY * DECAY_GROWTH ** (run - 1);
  assert.equal(h.score, Math.round(expected));
});

test('a run of missed days costs more than the same misses spread out', () => {
  // Six missed days in a row, against six misses each followed by a clear day.
  const streak = computeGoalHealth(simple(6)).score;
  const spread = computeGoalHealth(simple(12, {
    taskCompletions: Object.fromEntries([2, 4, 6, 8, 10, 12].map(d => [ago(d), { 1000: true }])),
  })).score;
  assert.ok(streak < spread, `${streak} should be below ${spread}`);
});

test('a long abandonment drives health towards zero, never below', () => {
  const h = computeGoalHealth(simple(40));
  assert.ok(h.score < 10, `got ${h.score}`);
  assert.ok(h.score >= 0);
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
  assert.ok(h.score <= 100 - 8);
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

test('a goal far ahead on milestones is never Stalled for missing half its habits', () => {
  // The reported case: 10/11 milestones done in under four weeks of a six-month
  // plan, one of two daily tasks done most days. It read "Stalled 0/100".
  const g = makeGoal({ id: 'sp', title: 'Learn Spanish', category: 'education', stages: 4, daysAgo: 26 });
  g.endDate = new Date(Date.now() + 147 * DAY).toISOString();
  g.subtasks = g.subtasks.slice(0, 11).map((m, i) => ({
    ...m, completed: i < 10, completedAt: new Date(Date.now() - (20 - i) * DAY).toISOString(), daysFromStart: 14 * (i + 1),
  }));
  g.dailyTasks = g.dailyTasks.slice(0, 2).map(t => ({ ...t, stageId: undefined }));
  g.taskCompletions = Object.fromEntries(Array.from({ length: 24 }, (_, i) => [ago(i + 1), (i < 22 ? { 1000: true } : { 1000: true, 1001: true }) as Record<string, boolean>]));
  const h = computeGoalHealth(g);
  assert.ok(h.score >= 65, `got ${h.score}`);
  assert.ok(h.reasons.some(r => r.startsWith('Ahead of plan')));
});

test('ticking today’s tasks raises health straight away', () => {
  const before = computeGoalHealth(simple(10)).score;
  const after = computeGoalHealth(simple(10, { taskCompletions: { [ago(0)]: { 1000: true } } })).score;
  assert.ok(after > before, `${after} should be above ${before}`);
});

test('a partial day costs less than an empty one and does not escalate', () => {
  const two = (done: boolean) => {
    const g = simple(10);
    g.dailyTasks = [g.dailyTasks[0], { ...g.dailyTasks[0], id: 1001 }];
    g.taskCompletions = done ? Object.fromEntries(Array.from({ length: 10 }, (_, i) => [ago(i + 1), { 1000: true }])) : {};
    return computeGoalHealth(g).score;
  };
  assert.ok(two(true) > two(false) + 20, `${two(true)} vs ${two(false)}`);
});
