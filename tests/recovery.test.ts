import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRecoveryPlan, applyAiAdjustments, FIRST_MILESTONE_IN, MIN_GAP } from '../lib/recovery';
import { computeGoalHealth } from '../lib/goalHealth';
import { dayKey } from '../lib/dates';
import { makeGoal } from '../scripts/ui-harness/fixtures';
import type { Goal } from '../lib/types';

const DAY = 86400000;
const ago = (d: number) => dayKey(new Date(Date.now() - d * DAY));

/** 40 days into a 100-day plan, nothing done: 4 of 10 milestones overdue, one every-day 45-min task never ticked. */
function slipping(): Goal {
  const g = makeGoal({ id: 'r', title: 'Run a 10k', category: 'fitness', stages: 1, daysAgo: 40 });
  g.endDate = new Date(Date.now() + 60 * DAY).toISOString();
  g.subtasks = Array.from({ length: 10 }, (_, i) => ({ id: 5000 + i, title: `m${i}`, daysFromStart: 10 * i + 5, completed: false }));
  g.dailyTasks = [{ ...g.dailyTasks[0], stageId: undefined, daysOfWeek: [], estimatedMinutes: 45 }];
  g.taskCompletions = {};
  return g;
}

const apply = (g: Goal, p: ReturnType<typeof buildRecoveryPlan>): Goal =>
  ({ ...g, subtasks: p.subtasks, dailyTasks: p.dailyTasks, endDate: p.endDate, recovery: p.recovery });

test('recovery needs no input and changes the timeline', () => {
  const g = slipping();
  const p = buildRecoveryPlan(g);
  const before = g.subtasks.map(m => m.daysFromStart);
  const after = p.subtasks.map(m => m.daysFromStart);
  assert.notDeepEqual(after, before);
  // Nothing open is overdue; the next one is a few days out; gaps respected.
  assert.equal(after[0], 40 + FIRST_MILESTONE_IN);
  for (let i = 1; i < after.length; i++) assert.ok(after[i] - after[i - 1] >= MIN_GAP - 1);
  assert.ok(p.changes.some(c => c.includes('overdue milestone')));
});

test('recovery lightens tasks the user keeps missing', () => {
  const p = buildRecoveryPlan(slipping());
  const t = p.dailyTasks[0];
  assert.equal(t.estimatedMinutes, 30);
  assert.equal(t.daysOfWeek?.length, 5);
  assert.ok(p.changes.some(c => c.includes('lightened')));
});

test('a task that is being done is left alone', () => {
  const g = slipping();
  g.taskCompletions = Object.fromEntries(Array.from({ length: 14 }, (_, i) => [ago(i + 1), { 1000: true }]));
  assert.deepEqual(buildRecoveryPlan(g).dailyTasks, g.dailyTasks);
});

test('goal health recovers once the plan is applied', () => {
  const g = slipping();
  const before = computeGoalHealth(g).score;
  const after = computeGoalHealth(apply(g, buildRecoveryPlan(g))).score;
  assert.ok(before < 20, `before ${before}`);
  assert.equal(after, 100);
});

test('the deadline moves out only when the remaining milestones no longer fit', () => {
  const g = slipping();
  g.endDate = new Date(Date.now() + 10 * DAY).toISOString(); // 10 open milestones, 10 days left
  const p = buildRecoveryPlan(g);
  const last = Math.max(...p.subtasks.map(m => m.daysFromStart));
  assert.equal(last, 40 + FIRST_MILESTONE_IN + 9 * MIN_GAP);
  assert.ok(new Date(p.endDate!).getTime() > new Date(g.endDate).getTime());
  assert.ok(p.changes.some(c => c.startsWith('Deadline moved')));
});

test('the AI tailoring is applied, within safe bounds', () => {
  const g = slipping();
  const base = buildRecoveryPlan(g);
  const p = applyAiAdjustments(g, base, {
    summary: 'Shorter weekday runs, long run on Saturday.',
    tasks: [{ id: 1000, title: 'Run 2km easy', daysOfWeek: [1, 3, 6, 9], estimatedMinutes: 9999 }, { id: 42, title: 'ghost' }],
    milestones: [{ id: 5000, daysFromStart: 1 }, { id: 5009, daysFromStart: 400 }],
  });
  const t = p.dailyTasks[0];
  assert.equal(t.title, 'Run 2km easy');
  assert.deepEqual(t.daysOfWeek, [1, 3, 6]);       // 9 isn't a weekday
  assert.equal(t.estimatedMinutes, 240);           // clamped
  assert.equal(p.dailyTasks.length, 1);            // unknown id ignored
  assert.equal(p.subtasks[0].daysFromStart, 41);   // can't be put in the past
  assert.equal(p.subtasks[9].daysFromStart, 400);
  assert.ok(new Date(p.endDate!).getTime() >= Date.now() + 350 * DAY, 'deadline follows the last milestone');
  assert.equal(p.changes[0], 'Shorter weekday runs, long run on Saturday.');
});

test('the coach’s schedule replaces the standard line instead of contradicting it', () => {
  const g = slipping();
  const p = applyAiAdjustments(g, buildRecoveryPlan(g), { tasks: [{ id: 1000, daysOfWeek: [0, 6], estimatedMinutes: 15 }] });
  assert.ok(!p.changes.some(c => c.includes('lightened')));
  assert.ok(p.changes.some(c => c.includes('now runs Sun, Sat, 15 min')));
});
