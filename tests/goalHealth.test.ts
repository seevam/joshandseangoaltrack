import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeGoalHealth } from '../lib/goalHealth';
import { dayKey } from '../lib/dates';
import { makeGoal } from '../scripts/ui-harness/fixtures';
import type { Goal } from '../lib/types';

const DAY = 86400000;
const ago = (d: number) => dayKey(new Date(Date.now() - d * DAY));

/**
 * A goal `elapsed` days into a 100-day timeline whose 10 milestones fall due
 * every 10 days from day 0 — so `elapsed`% of them are due by now — with
 * `pctDone` of them complete, and one every-day task done on `consistency`
 * of the last 14 days (the most recent days first).
 */
function scenario(elapsed: number, pctDone: number, consistency = 1): Goal {
  const g = makeGoal({ id: 'x', title: 'x', category: 'fitness', stages: 1, daysAgo: elapsed });
  g.endDate = new Date(Date.now() + (100 - elapsed) * DAY).toISOString();
  g.subtasks = Array.from({ length: 10 }, (_, i) => ({
    id: 5000 + i, title: `m${i}`, daysFromStart: 10 * i,
    completed: i < pctDone / 10, completedAt: new Date(Date.now() - DAY).toISOString(),
  }));
  g.dailyTasks = [{ ...g.dailyTasks[0], stageId: undefined, daysOfWeek: [] }];
  const doneDays = Math.round(14 * consistency);
  g.taskCompletions = Object.fromEntries(
    Array.from({ length: 14 }, (_, i) => i + 1).filter(d => d <= doneDays).map(d => [ago(d), { 1000: true }]),
  );
  return g;
}

test('ahead of schedule (91% vs 19%) scores high, never 0 — even with patchy habits', () => {
  const g = scenario(19, 90, 0.5);
  // 10 milestones can't show 91%; add an 11th open one so it reads 10/11.
  g.subtasks.push({ id: 6000, title: 'last', daysFromStart: 99, completed: false });
  g.subtasks = g.subtasks.map((m, i) => ({ ...m, completed: i < 10 }));
  const h = computeGoalHealth(g);
  assert.equal(h.completionRate, 91);
  assert.equal(h.pace, 1);
  assert.ok(h.score >= 80, `got ${h.score}`);
  assert.ok(h.reasons[0].startsWith('Ahead of plan'));
});

test('on track with every task done is 100', () => {
  const h = computeGoalHealth(scenario(50, 50, 1));
  assert.equal(h.pace, 1);
  assert.equal(h.score, 100);
});

test('slightly behind scores a little lower, in proportion', () => {
  const h = computeGoalHealth(scenario(50, 40, 1));
  assert.ok(Math.abs(h.pace - 0.8) < 0.01, String(h.pace));
  assert.equal(h.score, Math.round(100 * (0.7 * 0.8 + 0.3)));
  assert.ok(h.reasons[0].startsWith('Behind plan'));
});

test('far behind scores far lower', () => {
  const slightly = computeGoalHealth(scenario(50, 40, 1)).score;
  const far = computeGoalHealth(scenario(60, 10, 1)).score;
  assert.ok(far < slightly - 30, `${far} vs ${slightly}`);
  assert.equal(far, Math.round(100 * (0.7 * (10 / 60) + 0.3)));
});

test('zero progress and no tasks done is 0', () => {
  assert.equal(computeGoalHealth(scenario(40, 0, 0)).score, 0);
});

test('consistency adjusts the score but never overrides being ahead', () => {
  const perfect = computeGoalHealth(scenario(20, 50, 1)).score;
  const none = computeGoalHealth(scenario(20, 50, 0)).score;
  assert.equal(perfect, 100);
  assert.equal(none, 70);
});

test('a brand new goal is 100', () => {
  const g = makeGoal({ id: 'n', title: 'x', category: 'fitness', daysAgo: 0 });
  assert.equal(computeGoalHealth(g).score, 100);
});

test('stored full ISO dates never produce NaN', () => {
  const g = makeGoal({ id: 'n', title: 'x', category: 'fitness', daysAgo: 3 });
  assert.ok(Number.isFinite(computeGoalHealth(g).score));
  const junk = { ...g, startDate: 'not a date', createdAt: 'nope', endDate: 'no' };
  assert.ok(Number.isFinite(computeGoalHealth(junk).score));
});

test('ticking today’s task raises health straight away; not-yet-done today costs nothing', () => {
  const g = scenario(50, 50, 0.5);
  const before = computeGoalHealth(g).score;
  const after = computeGoalHealth({ ...g, taskCompletions: { ...g.taskCompletions, [ago(0)]: { 1000: true } } }).score;
  assert.ok(after > before, `${after} should beat ${before}`);
});

test('recent misses weigh more than old ones', () => {
  const recentMiss = scenario(50, 50, 1);
  delete recentMiss.taskCompletions[ago(1)];
  const oldMiss = scenario(50, 50, 1);
  delete oldMiss.taskCompletions[ago(13)];
  assert.ok(computeGoalHealth(recentMiss).consistency < computeGoalHealth(oldMiss).consistency);
});

test('opening a new stage does not re-judge past days against it', () => {
  const g = makeGoal({ id: 's', title: 'x', category: 'fitness', stages: 2, daysAgo: 20 });
  const now = new Date().toISOString();
  g.subtasks = g.subtasks.map(m => (m.stageId === 's0' ? { ...m, completed: true, completedAt: now, daysFromStart: 60 } : { ...m, daysFromStart: 60 }));
  g.taskCompletions = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [ago(i + 1), { 1000: true, 1001: true }]));
  const h = computeGoalHealth(g);
  assert.equal(h.missedTasks, 0, 'stage 2 tasks must not count before stage 2 began');
  assert.equal(h.consistency, 1);
});

test('after a recovery, misses before it no longer count', () => {
  const g = scenario(50, 50, 0);
  assert.equal(computeGoalHealth(g).consistency, 0);
  const h = computeGoalHealth({ ...g, recovery: { at: new Date().toISOString() } });
  assert.equal(h.consistency, 1);
  assert.equal(h.score, 100);
});

test('expected progress counts only milestones whose date has passed', () => {
  const g = makeGoal({ id: 'e', title: 'x', category: 'fitness', stages: 1, daysAgo: 3 });
  g.subtasks = [{ id: 1, title: 'first', daysFromStart: 10, completed: false }];
  const h = computeGoalHealth(g);
  assert.equal(h.expectedRate, 0);
  assert.equal(h.pace, 1);
});
